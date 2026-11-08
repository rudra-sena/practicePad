// The tools a teacher's Claude can use. Claude does the thinking and writing;
// these tools only save, read and edit data. No AI runs inside PracticePad.
import * as plans from './plans';

const taskSchema = {
  type: 'object',
  properties: {
    week: { type: 'integer', minimum: 1, description: 'Week number in the plan, starting at 1.' },
    title: { type: 'string', description: 'Short, concrete practice task, e.g. "Switch between G and C chords".' },
    details: { type: 'string', description: 'How to do it, in one or two plain sentences a student can follow.' },
    minutes: { type: 'integer', minimum: 1, maximum: 240, description: 'Minutes per practice session.' },
  },
  required: ['week', 'title'],
};

export const TOOLS = [
  {
    name: 'list_practice_plans',
    title: 'List practice plans',
    description: "List every student practice plan in this teacher's PracticePad, with progress (tasks done out of total) and last practice time. Use this first to find a plan id.",
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'get_practice_plan',
    title: 'Get a practice plan',
    description: 'Get one plan in full: goal, notes, every task with its id, week, minutes and whether the student has ticked it done. Use it before changing a plan or to report on progress.',
    inputSchema: { type: 'object', properties: { plan_id: { type: 'integer' } }, required: ['plan_id'] },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'create_practice_plan',
    title: 'Create a practice plan',
    description:
      'Save a new practice plan for a student. You write the plan: break the goal into weekly tasks (3 to 6 per week, specific and doable, with minutes). The app saves it, gives the teacher an editable page and the student a live link to tick tasks off.',
    inputSchema: {
      type: 'object',
      properties: {
        student_name: { type: 'string' },
        instrument: { type: 'string', description: 'e.g. Guitar, Keyboard, Vocals, Tabla, Violin.' },
        level: { type: 'string', description: 'Beginner, Intermediate or Advanced.' },
        goal: { type: 'string', description: 'The outcome in plain words, with a timeframe, e.g. "Play Happy Birthday with both hands in 2 weeks".' },
        weeks: { type: 'integer', minimum: 1, maximum: 52 },
        notes: { type: 'string', description: 'Teacher notes about the student (optional).' },
        tasks: { type: 'array', items: taskSchema },
      },
      required: ['student_name', 'instrument', 'goal', 'tasks'],
    },
  },
  {
    name: 'update_practice_plan',
    title: 'Update plan details',
    description: "Change a plan's details: student name, instrument, level, goal, number of weeks, notes, or status (active, paused, completed). Only send the fields that change.",
    inputSchema: {
      type: 'object',
      properties: {
        plan_id: { type: 'integer' },
        student_name: { type: 'string' },
        instrument: { type: 'string' },
        level: { type: 'string' },
        goal: { type: 'string' },
        weeks: { type: 'integer', minimum: 1, maximum: 52 },
        notes: { type: 'string' },
        status: { type: 'string', enum: plans.STATUSES },
      },
      required: ['plan_id'],
    },
  },
  {
    name: 'add_tasks',
    title: 'Add tasks to a plan',
    description: 'Add one or more new tasks to an existing plan, for example to extend it by a week or make it harder.',
    inputSchema: {
      type: 'object',
      properties: { plan_id: { type: 'integer' }, tasks: { type: 'array', items: taskSchema, minItems: 1 } },
      required: ['plan_id', 'tasks'],
    },
  },
  {
    name: 'update_task',
    title: 'Edit a task',
    description: 'Edit one task by its id: title, details, minutes, week, or mark it done / not done. Only send the fields that change.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'integer' },
        title: { type: 'string' },
        details: { type: 'string' },
        minutes: { type: 'integer', minimum: 1, maximum: 240 },
        week: { type: 'integer', minimum: 1 },
        done: { type: 'boolean' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'delete_task',
    title: 'Delete a task',
    description: 'Remove one task from a plan by its id.',
    inputSchema: { type: 'object', properties: { task_id: { type: 'integer' } }, required: ['task_id'] },
    annotations: { destructiveHint: true },
  },
  {
    name: 'delete_practice_plan',
    title: 'Delete a practice plan',
    description: 'Permanently delete a plan and all its tasks. Only do this when the teacher clearly asks.',
    inputSchema: { type: 'object', properties: { plan_id: { type: 'integer' } }, required: ['plan_id'] },
    annotations: { destructiveHint: true },
  },
];

function links(base, plan) {
  return {
    teacher_edit_link: `${base}/plans/${plan.id}`,
    student_link: plan.share_token ? `${base}/p/${plan.share_token}` : undefined,
  };
}

function planOut(base, p) {
  return {
    id: p.id,
    student_name: p.student_name,
    instrument: p.instrument,
    level: p.level,
    goal: p.goal,
    weeks: p.weeks,
    notes: p.notes,
    status: p.status,
    progress: p.progress,
    ...links(base, p),
    tasks: p.tasks.map((t) => ({ id: t.id, week: t.week, title: t.title, details: t.details, minutes: t.minutes, done: t.done, done_at: t.done_at })),
  };
}

export async function callTool(name, args, teacher, base) {
  const a = args || {};
  const tid = teacher.id;
  switch (name) {
    case 'list_practice_plans': {
      const rows = await plans.listPlans(tid);
      return {
        plans: rows.map((p) => ({
          id: p.id, student_name: p.student_name, instrument: p.instrument, goal: p.goal, status: p.status,
          progress: `${p.done_tasks}/${p.total_tasks} tasks done`, last_practice: p.last_practice, ...links(base, p),
        })),
      };
    }
    case 'get_practice_plan':
      return planOut(base, await plans.getPlan(tid, a.plan_id));
    case 'create_practice_plan': {
      const p = await plans.createPlan(tid, a, 'claude');
      return { message: 'Plan saved in PracticePad. Share the student link with the student.', plan: planOut(base, p) };
    }
    case 'update_practice_plan': {
      const { plan_id, ...rest } = a;
      return { message: 'Plan updated.', plan: planOut(base, await plans.updatePlan(tid, plan_id, rest)) };
    }
    case 'add_tasks':
      return { message: 'Tasks added.', plan: planOut(base, await plans.addTasks(tid, a.plan_id, a.tasks)) };
    case 'update_task': {
      const { task_id, ...rest } = a;
      return { message: 'Task updated.', task: await plans.updateTask(tid, task_id, rest) };
    }
    case 'delete_task':
      return await plans.deleteTask(tid, a.task_id);
    case 'delete_practice_plan':
      return await plans.deletePlan(tid, a.plan_id);
    default:
      throw new plans.AppError(`Unknown tool: ${name}`);
  }
}
