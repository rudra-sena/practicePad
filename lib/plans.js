// Core business logic, shared by the web app and the MCP server,
// so whatever Claude does and whatever a teacher does hit the same rules and data.
import { query } from './db';
import { token } from './auth';

const PLAN_FIELDS = ['student_name', 'instrument', 'level', 'goal', 'weeks', 'notes', 'status'];
const TASK_FIELDS = ['week', 'title', 'details', 'minutes', 'done', 'position'];
export const STATUSES = ['active', 'paused', 'completed'];

export class AppError extends Error {}

function clean(str, max = 2000) {
  return String(str ?? '').trim().slice(0, max);
}

function toInt(v, def, min, max) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function normaliseTask(t, idx) {
  if (!t || !clean(t.title)) throw new AppError('Every task needs a title.');
  return {
    week: toInt(t.week, 1, 1, 52),
    title: clean(t.title, 200),
    details: clean(t.details),
    minutes: toInt(t.minutes, 10, 1, 240),
    position: toInt(t.position, idx, 0, 10000),
  };
}

function progress(tasks) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
}

export async function listPlans(teacherId) {
  return query(
    `SELECT p.id, p.student_name, p.instrument, p.level, p.goal, p.weeks, p.status, p.share_token,
            p.created_via, p.updated_at,
            COUNT(t.id)::int AS total_tasks,
            COUNT(t.id) FILTER (WHERE t.done)::int AS done_tasks,
            MAX(t.done_at) AS last_practice
       FROM plans p LEFT JOIN tasks t ON t.plan_id = p.id
      WHERE p.teacher_id = $1
      GROUP BY p.id
      ORDER BY p.updated_at DESC`,
    [teacherId]
  );
}

async function tasksFor(planId) {
  return query('SELECT * FROM tasks WHERE plan_id = $1 ORDER BY week, position, id', [planId]);
}

export async function getPlan(teacherId, planId) {
  const rows = await query('SELECT * FROM plans WHERE id = $1 AND teacher_id = $2', [toInt(planId, 0, 0, 2e9), teacherId]);
  if (!rows[0]) throw new AppError(`Plan ${planId} not found.`);
  const tasks = await tasksFor(rows[0].id);
  return { ...rows[0], tasks, progress: progress(tasks) };
}

export async function getPlanByShare(shareToken) {
  const rows = await query(
    `SELECT p.id, p.student_name, p.instrument, p.level, p.goal, p.weeks, p.notes, p.status, p.updated_at,
            t.name AS teacher_name, t.academy
       FROM plans p JOIN teachers t ON t.id = p.teacher_id WHERE p.share_token = $1`,
    [String(shareToken)]
  );
  if (!rows[0]) throw new AppError('This practice plan link is not valid.');
  const tasks = await tasksFor(rows[0].id);
  const { id, ...plan } = rows[0];
  return { ...plan, tasks, progress: progress(tasks) };
}

export async function createPlan(teacherId, data, via = 'app') {
  const student_name = clean(data.student_name, 100);
  const instrument = clean(data.instrument, 60);
  const goal = clean(data.goal, 300);
  if (!student_name || !instrument || !goal) throw new AppError('Student name, instrument and goal are required.');
  const tasks = Array.isArray(data.tasks) ? data.tasks.map(normaliseTask) : [];
  const weeks = toInt(data.weeks, Math.max(1, ...tasks.map((t) => t.week), 1), 1, 52);
  const rows = await query(
    `INSERT INTO plans (teacher_id, student_name, instrument, level, goal, weeks, notes, share_token, created_via)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [teacherId, student_name, instrument, clean(data.level, 40) || 'Beginner', goal, weeks, clean(data.notes), token(9), via]
  );
  const planId = rows[0].id;
  for (const t of tasks) await insertTask(planId, t);
  return getPlan(teacherId, planId);
}

export async function updatePlan(teacherId, planId, data) {
  const plan = await getPlan(teacherId, planId);
  const sets = [];
  const vals = [];
  for (const f of PLAN_FIELDS) {
    if (data[f] === undefined) continue;
    let v = data[f];
    if (f === 'weeks') v = toInt(v, plan.weeks, 1, 52);
    else if (f === 'status') {
      v = clean(v).toLowerCase();
      if (!STATUSES.includes(v)) throw new AppError(`Status must be one of: ${STATUSES.join(', ')}.`);
    } else {
      v = clean(v);
      if (['student_name', 'instrument', 'goal'].includes(f) && !v) throw new AppError(`${f} cannot be empty.`);
    }
    vals.push(v);
    sets.push(`${f} = $${vals.length}`);
  }
  if (sets.length) {
    vals.push(plan.id);
    await query(`UPDATE plans SET ${sets.join(', ')}, updated_at = now() WHERE id = $${vals.length}`, vals);
  }
  return getPlan(teacherId, plan.id);
}

export async function deletePlan(teacherId, planId) {
  const plan = await getPlan(teacherId, planId);
  await query('DELETE FROM plans WHERE id = $1', [plan.id]);
  return { deleted: true, id: plan.id, student_name: plan.student_name };
}

async function insertTask(planId, t) {
  const rows = await query(
    `INSERT INTO tasks (plan_id, week, position, title, details, minutes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [planId, t.week, t.position, t.title, t.details, t.minutes]
  );
  return rows[0];
}

async function touch(planId) {
  await query('UPDATE plans SET updated_at = now() WHERE id = $1', [planId]);
}

export async function addTasks(teacherId, planId, tasks) {
  const plan = await getPlan(teacherId, planId);
  if (!Array.isArray(tasks) || !tasks.length) throw new AppError('Provide at least one task.');
  const startPos = plan.tasks.length;
  const added = [];
  for (const [i, raw] of tasks.entries()) {
    const t = normaliseTask(raw, startPos + i);
    if (raw.position === undefined) t.position = startPos + i;
    added.push(await insertTask(plan.id, t));
  }
  const maxWeek = Math.max(plan.weeks, ...added.map((t) => t.week));
  await query('UPDATE plans SET weeks = $1, updated_at = now() WHERE id = $2', [maxWeek, plan.id]);
  return getPlan(teacherId, plan.id);
}

async function ownedTask(teacherId, taskId) {
  const rows = await query(
    `SELECT t.* FROM tasks t JOIN plans p ON p.id = t.plan_id WHERE t.id = $1 AND p.teacher_id = $2`,
    [toInt(taskId, 0, 0, 2e9), teacherId]
  );
  if (!rows[0]) throw new AppError(`Task ${taskId} not found.`);
  return rows[0];
}

async function applyTaskUpdate(task, data) {
  const sets = [];
  const vals = [];
  for (const f of TASK_FIELDS) {
    if (data[f] === undefined) continue;
    let v = data[f];
    if (f === 'done') {
      v = v === true || v === 'true';
      sets.push(`done_at = ${v ? 'now()' : 'NULL'}`);
    } else if (f === 'week') v = toInt(v, task.week, 1, 52);
    else if (f === 'minutes') v = toInt(v, task.minutes, 1, 240);
    else if (f === 'position') v = toInt(v, task.position, 0, 10000);
    else {
      v = clean(v, f === 'title' ? 200 : 2000);
      if (f === 'title' && !v) throw new AppError('Task title cannot be empty.');
    }
    vals.push(v);
    sets.push(`${f} = $${vals.length}`);
  }
  if (!sets.length) return task;
  vals.push(task.id);
  const rows = await query(`UPDATE tasks SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals);
  if (data.week !== undefined) {
    await query('UPDATE plans SET weeks = GREATEST(weeks, $1) WHERE id = $2', [rows[0].week, task.plan_id]);
  }
  await touch(task.plan_id);
  return rows[0];
}

export async function updateTask(teacherId, taskId, data) {
  const task = await ownedTask(teacherId, taskId);
  return applyTaskUpdate(task, data);
}

export async function deleteTask(teacherId, taskId) {
  const task = await ownedTask(teacherId, taskId);
  await query('DELETE FROM tasks WHERE id = $1', [task.id]);
  await touch(task.plan_id);
  return { deleted: true, id: task.id, title: task.title };
}

// Students can only tick tasks on their own shared plan.
export async function setTaskDoneByShare(shareToken, taskId, done) {
  const rows = await query(
    `SELECT t.* FROM tasks t JOIN plans p ON p.id = t.plan_id WHERE p.share_token = $1 AND t.id = $2`,
    [String(shareToken), toInt(taskId, 0, 0, 2e9)]
  );
  if (!rows[0]) throw new AppError('Task not found on this plan.');
  return applyTaskUpdate(rows[0], { done: !!done });
}
