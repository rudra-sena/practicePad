// Mastercraft core logic. Shared by the web app and the MCP server,
// so whatever Claude does and whatever a person does follow the same rules.
// No AI runs here: this file only stores, checks and calculates.
import { query } from './db';
import { token } from './auth';
import { AppError } from './errors';

export { AppError };

export const THEMES = ['leadership', 'teamwork', 'impact', 'failure', 'initiative', 'personal'];

export const GAP_QUESTIONS = [
  { key: 'short_term_goal', q: 'What do you want to do right after your degree?' },
  { key: 'long_term_goal', q: 'Where do you see yourself in about 10 years?' },
  { key: 'why_now', q: 'Why is now the right time for this degree?' },
  { key: 'setback', q: 'Describe a time something you led did not go as planned.' },
  { key: 'conflict', q: 'A time you disagreed with someone important. What happened?' },
  { key: 'values', q: 'What do you care about most, and where does that come from?' },
  { key: 'outside_work', q: 'What do you do outside work that matters to you?' },
  { key: 'background', q: 'Anything about your background that shaped who you are?' },
];

const PROFILE_FIELDS = ['current_role', 'company', 'years_experience', 'industry', 'education', 'test_scores',
  'target_degree', 'target_intake', 'roles_timeline', 'skills', 'achievements', 'activities'];
const PROFILE_CORE = ['current_role', 'company', 'years_experience', 'education', 'target_degree', 'target_intake'];
const STORY_STATUSES = ['draft', 'needs_detail', 'confirmed'];
export const SCHOOL_STATUSES = ['in_progress', 'ready', 'submitted', 'interview', 'admitted', 'waitlisted', 'rejected'];

// ---------- helpers ----------
export function clean(v, max = 4000) {
  return String(v ?? '').trim().slice(0, max);
}
export function toInt(v, def = null, min = 0, max = 1e9) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}
export function countWords(text) {
  const t = String(text || '').trim();
  return t ? t.split(/\s+/).length : 0;
}
function parseJSON(s, def) {
  try { return typeof s === 'string' ? JSON.parse(s) : s ?? def; } catch { return def; }
}
function dateStr(d) {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}
export function daysLeft(d) {
  const s = dateStr(d);
  if (!s) return null;
  const today = new Date(new Date().toISOString().slice(0, 10));
  return Math.round((new Date(s) - today) / 86400000);
}
function themesList(t) {
  const arr = Array.isArray(t) ? t : String(t || '').split(',');
  return [...new Set(arr.map((x) => clean(x, 40).toLowerCase()).filter(Boolean))];
}
function listOf(v) {
  if (Array.isArray(v)) return v.map((x) => clean(x, 600)).filter(Boolean);
  return [];
}

// ---------- user / connection ----------
export async function markClaudeSeen(userId) {
  await query(
    `UPDATE mc_users SET claude_last_seen_at = now(), claude_connected_at = COALESCE(claude_connected_at, now()) WHERE id = $1`,
    [userId]
  );
}

// ---------- profile ----------
async function ensureProfile(uid) {
  const r = await query('SELECT * FROM mc_profiles WHERE user_id = $1', [uid]);
  if (r[0]) return r[0];
  return (await query('INSERT INTO mc_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id RETURNING *', [uid]))[0];
}

export async function getProfile(uid) {
  const [profile, answers, stories] = await Promise.all([
    ensureProfile(uid),
    query('SELECT * FROM mc_answers WHERE user_id = $1 ORDER BY id', [uid]),
    listStories(uid),
  ]);
  const gap = GAP_QUESTIONS.map((g) => {
    const a = answers.find((x) => x.question_key === g.key);
    return { key: g.key, question: g.q, answer: a?.answer || '', source: a?.source || null };
  });
  const extra = answers.filter((a) => !a.question_key || !GAP_QUESTIONS.some((g) => g.key === a.question_key));
  const coverage = THEMES.map((t) => ({ theme: t, count: stories.filter((s) => themesList(s.themes).includes(t)).length }));
  const coreFilled = PROFILE_CORE.filter((f) => clean(profile[f])).length;
  const gapsFilled = gap.filter((g) => g.answer).length;
  const completeness = Math.round(((coreFilled + gapsFilled) / (PROFILE_CORE.length + GAP_QUESTIONS.length)) * 100);
  return { profile, gap_questions: gap, other_answers: extra, stories, coverage, completeness };
}

export async function saveProfile(uid, data) {
  await ensureProfile(uid);
  const sets = [];
  const vals = [];
  for (const f of PROFILE_FIELDS) {
    if (data[f] === undefined) continue;
    vals.push(clean(data[f]));
    sets.push(`"${f}" = $${vals.length}`);
  }
  if (sets.length) {
    vals.push(uid);
    await query(`UPDATE mc_profiles SET ${sets.join(', ')}, updated_at = now() WHERE user_id = $${vals.length}`, vals);
  }
  return (await query('SELECT * FROM mc_profiles WHERE user_id = $1', [uid]))[0];
}

export async function saveAnswers(uid, answers, source = 'chat') {
  if (!Array.isArray(answers) || !answers.length) throw new AppError('Provide at least one answer.');
  const saved = [];
  for (const a of answers) {
    const answer = clean(a.answer, 1200);
    const key = clean(a.question_key, 60) || null;
    const gq = key && GAP_QUESTIONS.find((g) => g.key === key);
    const question = clean(a.question, 400) || gq?.q;
    if (!question) throw new AppError('Each answer needs its question.');
    const existing = key
      ? await query('SELECT id FROM mc_answers WHERE user_id = $1 AND question_key = $2', [uid, key])
      : await query('SELECT id FROM mc_answers WHERE user_id = $1 AND question = $2', [uid, question]);
    if (existing[0]) {
      await query('UPDATE mc_answers SET answer = $1, source = $2, updated_at = now() WHERE id = $3', [answer, source, existing[0].id]);
    } else {
      await query('INSERT INTO mc_answers (user_id, question_key, question, answer, source) VALUES ($1,$2,$3,$4,$5)', [uid, key, question, answer, source]);
    }
    saved.push({ question, answer });
  }
  return saved;
}

export async function deleteAnswer(uid, id) {
  await query('DELETE FROM mc_answers WHERE id = $1 AND user_id = $2', [toInt(id, 0), uid]);
  return { deleted: true };
}

// ---------- stories ----------
export async function listStories(uid) {
  const [stories, usage] = await Promise.all([query('SELECT * FROM mc_stories WHERE user_id = $1 ORDER BY id', [uid]), query(
    `SELECT DISTINCT ON (o.owner_type, o.owner_id) o.owner_type, o.owner_id, o.story_id,
            COALESCE(s.name, '') AS school, COALESCE(e.title, '') AS essay_title, r.name AS rec_name
       FROM mc_outlines o
       LEFT JOIN mc_essays e ON o.owner_type = 'essay' AND e.id = o.owner_id
       LEFT JOIN mc_rec_questions q ON o.owner_type = 'rec_question' AND q.id = o.owner_id
       LEFT JOIN mc_recommenders r ON r.id = q.recommender_id
       LEFT JOIN mc_schools s ON s.id = COALESCE(e.school_id, q.school_id)
      WHERE s.user_id = $1
      ORDER BY o.owner_type, o.owner_id, o.version DESC`,
    [uid]
  )]);
  return stories.map((s) => ({
    ...s,
    themes: themesList(s.themes),
    used_in: usage
      .filter((u) => u.story_id === s.id)
      .map((u) => (u.owner_type === 'essay' ? `${u.school} · ${u.essay_title}` : `${u.school} · ${u.rec_name}'s recommendation`)),
  }));
}

function storyFields(data, partial) {
  const out = {};
  if (!partial || data.title !== undefined) {
    out.title = clean(data.title, 160);
    if (!out.title) throw new AppError('A story needs a short title.');
  }
  for (const f of ['situation', 'action', 'result', 'role_context', 'period']) if (!partial || data[f] !== undefined) out[f] = clean(data[f], 2000);
  if (!partial || data.themes !== undefined) out.themes = themesList(data.themes).join(',');
  if (!partial || data.status !== undefined) {
    const st = clean(data.status || 'draft').toLowerCase();
    out.status = STORY_STATUSES.includes(st) ? st : 'draft';
  }
  return out;
}

export async function saveStory(uid, data) {
  const f = storyFields(data, false);
  if (f.status === 'confirmed') f.status = 'draft'; // only the applicant confirms stories
  const rows = await query(
    `INSERT INTO mc_stories (user_id, title, situation, action, result, themes, role_context, period, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [uid, f.title, f.situation, f.action, f.result, f.themes, f.role_context, f.period, f.status]
  );
  return (await query('SELECT * FROM mc_stories WHERE id = $1', [rows[0].id]))[0];
}

export async function updateStory(uid, id, data, { byClaude = false } = {}) {
  const rows = await query('SELECT * FROM mc_stories WHERE id = $1 AND user_id = $2', [toInt(id, 0), uid]);
  if (!rows[0]) throw new AppError(`Story ${id} not found.`);
  const f = storyFields(data, true);
  if (byClaude && f.status === 'confirmed') delete f.status;
  const keys = Object.keys(f);
  if (keys.length) {
    const vals = keys.map((k) => f[k]);
    vals.push(rows[0].id);
    await query(`UPDATE mc_stories SET ${keys.map((k, i) => `${k} = $${i + 1}`).join(', ')}, updated_at = now() WHERE id = $${vals.length}`, vals);
  }
  return (await query('SELECT * FROM mc_stories WHERE id = $1', [rows[0].id]))[0];
}

export async function deleteStory(uid, id) {
  await query('DELETE FROM mc_stories WHERE id = $1 AND user_id = $2', [toInt(id, 0), uid]);
  return { deleted: true };
}

// ---------- versions & outlines (shared by essays and recommendation questions) ----------
async function latestVersion(type, id) {
  return (await query('SELECT * FROM mc_versions WHERE owner_type = $1 AND owner_id = $2 ORDER BY version DESC LIMIT 1', [type, id]))[0] || null;
}
async function allVersions(type, id) {
  return query('SELECT * FROM mc_versions WHERE owner_type = $1 AND owner_id = $2 ORDER BY version DESC', [type, id]);
}
async function latestOutline(type, id) {
  const o = (await query('SELECT * FROM mc_outlines WHERE owner_type = $1 AND owner_id = $2 ORDER BY version DESC LIMIT 1', [type, id]))[0];
  return o ? { ...o, sections: parseJSON(o.sections, []) } : null;
}
async function addVersion(type, id, text, editedBy) {
  const body = clean(text, 30000);
  const last = await latestVersion(type, id);
  if (last && last.body === body) return last;
  const v = (last?.version || 0) + 1;
  await query('INSERT INTO mc_versions (owner_type, owner_id, version, body, word_count, edited_by) VALUES ($1,$2,$3,$4,$5,$6)', [type, id, v, body, countWords(body), editedBy]);
  return latestVersion(type, id);
}

function normaliseSections(sections) {
  if (!Array.isArray(sections) || !sections.length) throw new AppError('An outline needs at least one section.');
  return sections.slice(0, 10).map((s) => ({
    heading: clean(s.heading, 120) || 'Section',
    points: listOf(s.points),
    facts: listOf(s.facts),
    words: toInt(s.words, null, 0, 5000),
  }));
}

export async function saveOutline(uid, ownerType, ownerId, data, editedBy) {
  if (ownerType === 'essay') await essayOwned(uid, ownerId);
  else if (ownerType === 'rec_question') await recQuestionOwned(uid, ownerId);
  else throw new AppError('Unknown outline target.');
  let storyId = toInt(data.story_id, null);
  if (storyId) {
    const s = await query('SELECT id FROM mc_stories WHERE id = $1 AND user_id = $2', [storyId, uid]);
    if (!s[0]) storyId = null;
  }
  const last = await latestOutline(ownerType, ownerId);
  const v = (last?.version || 0) + 1;
  await query(
    `INSERT INTO mc_outlines (owner_type, owner_id, version, story_id, story_reason, angle, sections, ending, edited_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [ownerType, ownerId, v, storyId, clean(data.story_reason, 600), clean(data.angle, 1000), JSON.stringify(normaliseSections(data.sections)), clean(data.ending, 1000), editedBy]
  );
  if (ownerType === 'essay') {
    await query(`UPDATE mc_essays SET status = CASE WHEN status = 'not_started' THEN 'outlined' ELSE status END, updated_at = now() WHERE id = $1`, [ownerId]);
  } else {
    await query('UPDATE mc_rec_questions SET outline_final = false, updated_at = now() WHERE id = $1', [ownerId]);
  }
  return latestOutline(ownerType, ownerId);
}

// ---------- schools ----------
async function schoolOwned(uid, id) {
  const r = await query('SELECT * FROM mc_schools WHERE id = $1 AND user_id = $2', [toInt(id, 0), uid]);
  if (!r[0]) throw new AppError(`School ${id} not found.`);
  return r[0];
}

function schoolOut(s) {
  return { ...s, deadline: dateStr(s.deadline), days_left: daysLeft(s.deadline) };
}

export async function listSchools(uid) {
  const [schools, essays, checks, recs] = await Promise.all([
    query('SELECT * FROM mc_schools WHERE user_id = $1 ORDER BY deadline NULLS LAST, id', [uid]),
    query('SELECT e.id, e.school_id, e.status FROM mc_essays e JOIN mc_schools s ON s.id = e.school_id WHERE s.user_id = $1', [uid]),
    query('SELECT c.school_id, c.done FROM mc_checklist c JOIN mc_schools s ON s.id = c.school_id WHERE s.user_id = $1', [uid]),
    query(`SELECT rs.school_id, rs.submitted_at, r.name FROM mc_rec_schools rs JOIN mc_recommenders r ON r.id = rs.recommender_id WHERE r.user_id = $1`, [uid]),
  ]);
  return schools.map((s) => {
    const es = essays.filter((e) => e.school_id === s.id);
    const cs = checks.filter((c) => c.school_id === s.id);
    const rs = recs.filter((r) => r.school_id === s.id);
    return {
      ...schoolOut(s),
      essays_total: es.length,
      essays_final: es.filter((e) => e.status === 'final').length,
      checklist_total: cs.length,
      checklist_done: cs.filter((c) => c.done).length,
      recs_total: rs.length,
      recs_submitted: rs.filter((r) => r.submitted_at).length,
      recs_pending: rs.filter((r) => !r.submitted_at).map((r) => r.name),
    };
  });
}

const ESSAYS_WITH_LATEST = `
  SELECT e.*, COALESCE(v.version, 0) AS latest_version, COALESCE(v.word_count, 0) AS word_count
    FROM mc_essays e
    LEFT JOIN LATERAL (SELECT version, word_count FROM mc_versions WHERE owner_type = 'essay' AND owner_id = e.id ORDER BY version DESC LIMIT 1) v ON true`;

export async function getSchool(uid, id) {
  const s = await schoolOwned(uid, id);
  const [out, checklist, checks, recs] = await Promise.all([
    query(`${ESSAYS_WITH_LATEST} WHERE e.school_id = $1 ORDER BY e.position, e.id`, [s.id]),
    query('SELECT * FROM mc_checklist WHERE school_id = $1 ORDER BY position, id', [s.id]),
    query('SELECT * FROM mc_school_checks WHERE school_id = $1 ORDER BY id DESC LIMIT 1', [s.id]),
    query(`SELECT r.id, r.name, r.relationship, rs.submitted_at FROM mc_rec_schools rs JOIN mc_recommenders r ON r.id = rs.recommender_id WHERE rs.school_id = $1`, [s.id]),
  ]);
  const check = checks[0];
  return {
    ...schoolOut(s),
    essays: out,
    checklist,
    recommenders: recs,
    latest_check: check ? { ...check, findings: parseJSON(check.findings, []) } : null,
  };
}

export async function addSchool(uid, data) {
  const name = clean(data.name, 120);
  if (!name) throw new AppError('School name is required.');
  const program = clean(data.program, 160);
  const round = clean(data.round, 60);
  const dup = await query('SELECT id FROM mc_schools WHERE user_id = $1 AND lower(name) = lower($2) AND lower(program) = lower($3) AND lower(round) = lower($4)', [uid, name, program, round]);
  if (dup[0]) throw new AppError(`${name} (${program || 'program'}, ${round || 'round'}) is already in Mastercraft as school ${dup[0].id}. Use update_school to change it.`);
  const deadline = clean(data.deadline, 10);
  if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) throw new AppError('Deadline must be a date like 2027-01-15.');
  const rows = await query(
    `INSERT INTO mc_schools (user_id, name, program, round, deadline, fee, notes, sources, data_note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [uid, name, program, round, deadline || null, clean(data.fee, 60), clean(data.notes, 4000), listOf(data.sources).join('\n'), clean(data.data_note, 300)]
  );
  const sid = rows[0].id;
  const essays = Array.isArray(data.essays) ? data.essays : [];
  for (const [i, e] of essays.entries()) {
    const prompt = clean(e.prompt, 2000);
    if (!prompt) continue;
    await query('INSERT INTO mc_essays (school_id, title, prompt, word_limit, position) VALUES ($1,$2,$3,$4,$5)', [sid, clean(e.title, 80) || `Essay ${i + 1}`, prompt, toInt(e.word_limit, null, 1, 5000), i]);
  }
  for (const [i, label] of listOf(data.checklist).entries()) {
    await query('INSERT INTO mc_checklist (school_id, label, position) VALUES ($1,$2,$3)', [sid, label.slice(0, 200), i]);
  }
  return getSchool(uid, sid);
}

export async function updateSchool(uid, id, data) {
  const s = await schoolOwned(uid, id);
  const sets = [];
  const vals = [];
  const set = (k, v) => { vals.push(v); sets.push(`${k} = $${vals.length}`); };
  for (const f of ['name', 'program', 'round', 'fee', 'notes', 'data_note']) if (data[f] !== undefined) set(f, clean(data[f], 4000));
  if (data.deadline !== undefined) {
    const d = clean(data.deadline, 10);
    if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new AppError('Deadline must be a date like 2027-01-15.');
    set('deadline', d || null);
  }
  if (data.sources !== undefined) set('sources', Array.isArray(data.sources) ? listOf(data.sources).join('\n') : clean(data.sources));
  if (data.verified !== undefined) set('verified', !!data.verified);
  if (data.status !== undefined) {
    const st = clean(data.status).toLowerCase();
    if (!SCHOOL_STATUSES.includes(st)) throw new AppError(`Status must be one of: ${SCHOOL_STATUSES.join(', ')}.`);
    set('status', st);
  }
  if (sets.length) {
    vals.push(s.id);
    await query(`UPDATE mc_schools SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals);
  }
  if (Array.isArray(data.essays)) {
    for (const e of data.essays) {
      if (e.id) {
        await updateEssayMeta(uid, e.id, e);
      } else if (clean(e.prompt)) {
        const pos = (await query('SELECT COUNT(*)::int AS n FROM mc_essays WHERE school_id = $1', [s.id]))[0].n;
        await query('INSERT INTO mc_essays (school_id, title, prompt, word_limit, position) VALUES ($1,$2,$3,$4,$5)', [s.id, clean(e.title, 80) || `Essay ${pos + 1}`, clean(e.prompt, 2000), toInt(e.word_limit, null, 1, 5000), pos]);
      }
    }
  }
  if (Array.isArray(data.add_checklist)) {
    for (const label of listOf(data.add_checklist)) await query('INSERT INTO mc_checklist (school_id, label, position) VALUES ($1,$2,999)', [s.id, label.slice(0, 200)]);
  }
  return getSchool(uid, s.id);
}

export async function deleteSchool(uid, id) {
  const s = await schoolOwned(uid, id);
  await query('DELETE FROM mc_schools WHERE id = $1', [s.id]);
  return { deleted: true };
}

export async function setChecklistItem(uid, itemId, data) {
  const r = await query('SELECT c.* FROM mc_checklist c JOIN mc_schools s ON s.id = c.school_id WHERE c.id = $1 AND s.user_id = $2', [toInt(itemId, 0), uid]);
  if (!r[0]) throw new AppError('Checklist item not found.');
  if (data.delete) {
    await query('DELETE FROM mc_checklist WHERE id = $1', [r[0].id]);
  } else {
    if (data.done !== undefined) await query('UPDATE mc_checklist SET done = $1 WHERE id = $2', [!!data.done, r[0].id]);
    if (data.label !== undefined && clean(data.label)) await query('UPDATE mc_checklist SET label = $1 WHERE id = $2', [clean(data.label, 200), r[0].id]);
  }
  return { ok: true };
}

export async function addChecklistItem(uid, schoolId, label) {
  const s = await schoolOwned(uid, schoolId);
  if (!clean(label)) throw new AppError('Add a label.');
  await query('INSERT INTO mc_checklist (school_id, label, position) VALUES ($1,$2,999)', [s.id, clean(label, 200)]);
  return { ok: true };
}

export async function schoolDecision(uid, id, decision) {
  const s = await schoolOwned(uid, id);
  if (!['proceed', 'skip'].includes(decision)) throw new AppError('Unknown decision.');
  await query(`UPDATE mc_schools SET status = 'ready' WHERE id = $1`, [s.id]);
  return getSchool(uid, s.id);
}

// ---------- essays ----------
async function essayOwned(uid, id) {
  const r = await query('SELECT e.*, s.name AS school_name, s.user_id FROM mc_essays e JOIN mc_schools s ON s.id = e.school_id WHERE e.id = $1 AND s.user_id = $2', [toInt(id, 0), uid]);
  if (!r[0]) throw new AppError(`Essay ${id} not found.`);
  return r[0];
}

async function updateEssayMeta(uid, id, data) {
  const e = await essayOwned(uid, id);
  if (data.prompt !== undefined && clean(data.prompt)) await query('UPDATE mc_essays SET prompt = $1 WHERE id = $2', [clean(data.prompt, 2000), e.id]);
  if (data.title !== undefined && clean(data.title)) await query('UPDATE mc_essays SET title = $1 WHERE id = $2', [clean(data.title, 80), e.id]);
  if (data.word_limit !== undefined) await query('UPDATE mc_essays SET word_limit = $1 WHERE id = $2', [toInt(data.word_limit, null, 1, 5000), e.id]);
}
export { updateEssayMeta };

export async function listEssays(uid) {
  const [schools, essays] = await Promise.all([
    listSchools(uid),
    query(`${ESSAYS_WITH_LATEST} JOIN mc_schools s ON s.id = e.school_id WHERE s.user_id = $1 ORDER BY e.position, e.id`, [uid]),
  ]);
  return schools.map((s) => ({ school: s, essays: essays.filter((e) => e.school_id === s.id) }));
}

export async function getEssayFull(uid, id) {
  const e = await essayOwned(uid, id);
  const [school, versions, outline, rv] = await Promise.all([
    getSchool(uid, e.school_id),
    allVersions('essay', e.id),
    latestOutline('essay', e.id),
    query('SELECT * FROM mc_reviews WHERE essay_id = $1 ORDER BY id DESC', [e.id]),
  ]);
  const reviews = rv.map((r) => ({ ...r, strengths: parseJSON(r.strengths, []), fixes: parseJSON(r.fixes, []) }));
  return { essay: e, school, versions, outline, reviews };
}

// Context Claude needs to plan or review one essay.
export async function getEssayContext(uid, id) {
  const [{ essay, school, versions, outline, reviews }, prof] = await Promise.all([getEssayFull(uid, id), getProfile(uid)]);
  const siblings = await Promise.all(school.essays.filter((x) => x.id !== essay.id).map(async (other) => {
    const [v, o] = await Promise.all([latestVersion('essay', other.id), latestOutline('essay', other.id)]);
    return { id: other.id, title: other.title, prompt: other.prompt, status: other.status, story_id: o?.story_id || null, latest_draft: v?.body || '' };
  }));
  return {
    essay: { id: essay.id, school: school.name, program: school.program, round: school.round, title: essay.title, prompt: essay.prompt, word_limit: essay.word_limit, status: essay.status },
    school_notes: school.notes,
    latest_draft: versions[0] ? { version: versions[0].version, text: versions[0].body, word_count: versions[0].word_count } : null,
    outline,
    previous_review: reviews[0] || null,
    profile: prof.profile,
    profile_answers: [...prof.gap_questions.filter((g) => g.answer), ...prof.other_answers],
    stories: prof.stories.filter((s) => s.status === 'confirmed').map(({ id, title, situation, action, result, themes, role_context, period, used_in }) => ({ id, title, situation, action, result, themes, role_context, period, used_in })),
    unconfirmed_stories_count: prof.stories.filter((s) => s.status !== 'confirmed').length,
    other_essays_same_school: siblings,
  };
}

export async function saveEssayVersion(uid, id, text) {
  const e = await essayOwned(uid, id);
  if (e.status === 'final') throw new AppError('This essay is marked final. Reopen it to keep editing.');
  const before = await latestVersion('essay', e.id);
  const v = await addVersion('essay', e.id, text, 'applicant');
  if (!before || v.version !== before.version) await query(`UPDATE mc_essays SET status = 'drafting', updated_at = now() WHERE id = $1`, [e.id]);
  return v;
}

export async function setEssayFinal(uid, id, final) {
  const e = await essayOwned(uid, id);
  const v = await latestVersion('essay', e.id);
  if (final && !v) throw new AppError('Write a draft before marking it final.');
  let status = 'final';
  if (!final) {
    const r = (await query('SELECT version FROM mc_reviews WHERE essay_id = $1 ORDER BY id DESC LIMIT 1', [e.id]))[0];
    status = r && v && r.version === v.version ? 'reviewed' : v ? 'drafting' : 'outlined';
  }
  await query('UPDATE mc_essays SET status = $1, updated_at = now() WHERE id = $2', [status, e.id]);
  const remaining = await query(`SELECT COUNT(*)::int AS n FROM mc_essays WHERE school_id = $1 AND status <> 'final'`, [e.school_id]);
  return { status, school_id: e.school_id, all_final: final && remaining[0].n === 0 };
}

export async function saveReview(uid, id, data) {
  const e = await essayOwned(uid, id);
  const v = await latestVersion('essay', e.id);
  if (!v) throw new AppError('This essay has no draft yet. Ask the applicant to write one in Mastercraft first.');
  const version = data.version ? toInt(data.version, v.version) : v.version;
  if (!(await query('SELECT 1 FROM mc_versions WHERE owner_type = $1 AND owner_id = $2 AND version = $3', ['essay', e.id, version]))[0]) {
    throw new AppError(`Draft version ${version} does not exist.`);
  }
  const overall = clean(data.overall, 3000);
  if (!overall) throw new AppError('A review needs an overall view.');
  const fixes = Array.isArray(data.fixes) ? data.fixes.slice(0, 8).map((f) => ({ where: clean(f.where, 120), issue: clean(f.issue, 800), suggestion: clean(f.suggestion, 800) })) : [];
  await query('INSERT INTO mc_reviews (essay_id, version, overall, strengths, fixes, fact_check) VALUES ($1,$2,$3,$4,$5,$6)', [e.id, version, overall, JSON.stringify(listOf(data.strengths)), JSON.stringify(fixes), clean(data.fact_check, 1500)]);
  if (version === v.version && e.status !== 'final') await query(`UPDATE mc_essays SET status = 'reviewed', updated_at = now() WHERE id = $1`, [e.id]);
  return { essay_id: e.id, version };
}

// ---------- final check per school ----------
export async function getSchoolApplication(uid, schoolId) {
  const [school, prof] = await Promise.all([getSchool(uid, schoolId), getProfile(uid)]);
  const essays = await Promise.all(school.essays.map(async (e) => {
    const [v, o] = await Promise.all([latestVersion('essay', e.id), latestOutline('essay', e.id)]);
    return { id: e.id, title: e.title, prompt: e.prompt, word_limit: e.word_limit, status: e.status, word_count: v?.word_count || 0, text: v?.body || '', story_id: o?.story_id || null };
  }));
  const recs = await Promise.all(school.recommenders.map(async (r) => {
    const qs = await query('SELECT * FROM mc_rec_questions WHERE recommender_id = $1 AND school_id = $2 ORDER BY position, id', [r.id, school.id]);
    const answers = await Promise.all(qs.map(async (q) => {
      const [v, o] = await Promise.all([latestVersion('rec_question', q.id), latestOutline('rec_question', q.id)]);
      return { question: q.question, outline: o, draft: v?.body || '' };
    }));
    return { name: r.name, relationship: r.relationship, submitted: !!r.submitted_at, answers };
  }));
  return {
    school: { id: school.id, name: school.name, program: school.program, round: school.round, deadline: school.deadline, notes: school.notes },
    essays,
    recommendations: recs,
    profile: prof.profile,
    profile_answers: [...prof.gap_questions.filter((g) => g.answer), ...prof.other_answers],
    stories: prof.stories.filter((s) => s.status === 'confirmed'),
  };
}

export async function saveSchoolCheck(uid, schoolId, data) {
  const s = await schoolOwned(uid, schoolId);
  const sev = ['must_fix', 'consider', 'looks_good'];
  const findings = Array.isArray(data.findings)
    ? data.findings.slice(0, 15).map((f) => ({
        severity: sev.includes(clean(f.severity).toLowerCase()) ? clean(f.severity).toLowerCase() : 'consider',
        area: clean(f.area, 60), finding: clean(f.finding, 800), suggestion: clean(f.suggestion, 800),
      }))
    : [];
  if (!findings.length) throw new AppError('Add at least one finding.');
  await query('INSERT INTO mc_school_checks (school_id, summary, findings) VALUES ($1,$2,$3)', [s.id, clean(data.summary, 1500), JSON.stringify(findings)]);
  return { school_id: s.id, findings: findings.length };
}

// ---------- recommenders ----------
async function recOwned(uid, id) {
  const r = await query('SELECT * FROM mc_recommenders WHERE id = $1 AND user_id = $2', [toInt(id, 0), uid]);
  if (!r[0]) throw new AppError(`Recommender ${id} not found.`);
  return r[0];
}
async function recQuestionOwned(uid, qid) {
  const r = await query('SELECT q.* FROM mc_rec_questions q JOIN mc_recommenders r ON r.id = q.recommender_id WHERE q.id = $1 AND r.user_id = $2', [toInt(qid, 0), uid]);
  if (!r[0]) throw new AppError(`Recommendation question ${qid} not found.`);
  return r[0];
}

// Resolves who is acting on a recommender panel: the applicant (session) or the recommender (link token).
export async function recAccess({ user, token: t, recId }) {
  if (t) {
    const r = (await query('SELECT * FROM mc_recommenders WHERE link_token = $1', [String(t)]))[0];
    if (!r || (recId && r.id !== toInt(recId, 0))) throw new AppError('This recommender link is not valid.');
    return { rec: r, role: 'recommender', uid: r.user_id };
  }
  if (!user) throw new AppError('Please log in.');
  return { rec: await recOwned(user.id, recId), role: 'applicant', uid: user.id };
}

export async function listRecommenders(uid) {
  const recs = await query('SELECT * FROM mc_recommenders WHERE user_id = $1 ORDER BY id', [uid]);
  return Promise.all(recs.map((r) => recPanel(r, 'applicant')));
}

export async function addRecommender(uid, data) {
  const name = clean(data.name, 100);
  if (!name) throw new AppError('Add the recommender’s name.');
  const rows = await query('INSERT INTO mc_recommenders (user_id, name, relationship, email, link_token) VALUES ($1,$2,$3,$4,$5) RETURNING id', [uid, name, clean(data.relationship, 120), clean(data.email, 200), token(15)]);
  await setRecSchools(uid, rows[0].id, data.school_ids || []);
  return rows[0];
}

export async function updateRecommender(uid, id, data) {
  const r = await recOwned(uid, id);
  for (const f of ['name', 'relationship', 'email']) if (data[f] !== undefined) await query(`UPDATE mc_recommenders SET ${f} = $1 WHERE id = $2`, [clean(data[f], 200), r.id]);
  if (Array.isArray(data.school_ids)) await setRecSchools(uid, r.id, data.school_ids);
  return { ok: true };
}

async function setRecSchools(uid, recId, schoolIds) {
  const ids = [...new Set((schoolIds || []).map((x) => toInt(x, 0)).filter(Boolean))];
  const valid = ids.length ? await query(`SELECT id FROM mc_schools WHERE user_id = $1 AND id = ANY($2::int[])`, [uid, ids]) : [];
  const keep = valid.map((v) => v.id);
  const current = await query('SELECT school_id FROM mc_rec_schools WHERE recommender_id = $1', [recId]);
  for (const c of current) if (!keep.includes(c.school_id)) await query('DELETE FROM mc_rec_schools WHERE recommender_id = $1 AND school_id = $2', [recId, c.school_id]);
  for (const k of keep) await query('INSERT INTO mc_rec_schools (recommender_id, school_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [recId, k]);
}

export async function deleteRecommender(uid, id) {
  const r = await recOwned(uid, id);
  await query('DELETE FROM mc_recommenders WHERE id = $1', [r.id]);
  return { deleted: true };
}

function questionStatus(q, outline, version) {
  if (q.final) return 'final';
  if (version) return 'drafting';
  if (q.outline_final) return 'outline_final';
  if (outline) return 'outlined';
  return 'added';
}

export async function recPanel(rec, role) {
  const [schools, qs, outlines, versionsAll, users] = await Promise.all([
    query(`SELECT s.id, s.name, s.program, s.round, s.deadline, rs.submitted_at FROM mc_rec_schools rs JOIN mc_schools s ON s.id = rs.school_id WHERE rs.recommender_id = $1 ORDER BY s.deadline NULLS LAST`, [rec.id]),
    query('SELECT * FROM mc_rec_questions WHERE recommender_id = $1 ORDER BY school_id, position, id', [rec.id]),
    query(`SELECT DISTINCT ON (o.owner_id) o.*, st.title AS story_title FROM mc_outlines o JOIN mc_rec_questions q ON o.owner_type = 'rec_question' AND q.id = o.owner_id LEFT JOIN mc_stories st ON st.id = o.story_id WHERE q.recommender_id = $1 ORDER BY o.owner_id, o.version DESC`, [rec.id]),
    query(`SELECT v.* FROM mc_versions v JOIN mc_rec_questions q ON v.owner_type = 'rec_question' AND q.id = v.owner_id WHERE q.recommender_id = $1 ORDER BY v.version DESC`, [rec.id]),
    query('SELECT name FROM mc_users WHERE id = $1', [rec.user_id]),
  ]);
  const questions = qs.map((q) => {
    const o = outlines.find((x) => x.owner_id === q.id);
    const outline = o ? { ...o, sections: parseJSON(o.sections, []) } : null;
    const versions = versionsAll.filter((v) => v.owner_id === q.id);
    return { ...q, outline, versions, latest: versions[0] || null, status: questionStatus(q, outline, versions[0]) };
  });
  const applicant = users[0];
  return {
    id: rec.id, name: rec.name, relationship: rec.relationship, email: role === 'applicant' ? rec.email : undefined,
    link_token: role === 'applicant' ? rec.link_token : undefined, applicant_name: applicant?.name,
    schools: schools.map((s) => ({ ...s, deadline: dateStr(s.deadline), days_left: daysLeft(s.deadline) })),
    questions, role,
  };
}

export async function addRecQuestion(rec, data) {
  const sid = toInt(data.school_id, 0);
  const ok = await query('SELECT 1 FROM mc_rec_schools WHERE recommender_id = $1 AND school_id = $2', [rec.id, sid]);
  if (!ok[0]) throw new AppError('Pick one of this recommender’s schools.');
  const question = clean(data.question, 1500);
  if (!question) throw new AppError('Add the question text.');
  await query('INSERT INTO mc_rec_questions (recommender_id, school_id, question, word_limit, position) VALUES ($1,$2,$3,$4,999)', [rec.id, sid, question, toInt(data.word_limit, null, 1, 5000)]);
  return { ok: true };
}

async function recQuestionInRec(rec, qid) {
  const r = await query('SELECT * FROM mc_rec_questions WHERE id = $1 AND recommender_id = $2', [toInt(qid, 0), rec.id]);
  if (!r[0]) throw new AppError('Question not found.');
  return r[0];
}

export async function updateRecQuestion(rec, qid, data) {
  const q = await recQuestionInRec(rec, qid);
  if (data.delete) { await query('DELETE FROM mc_rec_questions WHERE id = $1', [q.id]); return { deleted: true }; }
  if (data.question !== undefined && clean(data.question)) await query('UPDATE mc_rec_questions SET question = $1 WHERE id = $2', [clean(data.question, 1500), q.id]);
  if (data.word_limit !== undefined) await query('UPDATE mc_rec_questions SET word_limit = $1 WHERE id = $2', [toInt(data.word_limit, null, 1, 5000), q.id]);
  if (data.outline_final !== undefined) {
    if (data.outline_final && !(await latestOutline('rec_question', q.id))) throw new AppError('There is no outline yet.');
    await query('UPDATE mc_rec_questions SET outline_final = $1 WHERE id = $2', [!!data.outline_final, q.id]);
  }
  if (data.final !== undefined) {
    if (data.final && !(await latestVersion('rec_question', q.id))) throw new AppError('Write a draft before marking it final.');
    await query('UPDATE mc_rec_questions SET final = $1 WHERE id = $2', [!!data.final, q.id]);
  }
  return { ok: true };
}

export async function saveRecDraft(rec, qid, text, role) {
  const q = await recQuestionInRec(rec, qid);
  if (!q.outline_final) throw new AppError('Mark the outline final before drafting.');
  return addVersion('rec_question', q.id, text, role === 'recommender' ? rec.name : 'applicant');
}

export async function setRecSubmitted(rec, schoolId, submitted, role) {
  if (role !== 'recommender') throw new AppError('Only the recommender can mark a recommendation as submitted.');
  const r = await query('UPDATE mc_rec_schools SET submitted_at = $1 WHERE recommender_id = $2 AND school_id = $3 RETURNING school_id', [submitted ? new Date().toISOString() : null, rec.id, toInt(schoolId, 0)]);
  if (!r[0]) throw new AppError('School not found for this recommender.');
  return { ok: true };
}

// Context Claude needs to outline a recommender's answers.
export async function getRecommendationContext(uid, recId) {
  const rec = await recOwned(uid, recId);
  const [panel, prof] = await Promise.all([recPanel(rec, 'applicant'), getProfile(uid)]);
  const schoolEssays = await Promise.all(panel.schools.map(async (s) => {
    const full = await getSchool(uid, s.id);
    const essays = await Promise.all(full.essays.map(async (e) => {
      const o = await latestOutline('essay', e.id);
      return { title: e.title, prompt: e.prompt, story_id: o?.story_id || null, angle: o?.angle || '' };
    }));
    return { school: s.name, essays };
  }));
  return {
    recommender: { id: rec.id, name: rec.name, relationship: rec.relationship },
    schools: panel.schools.map((s) => ({ id: s.id, name: s.name, deadline: s.deadline, submitted: !!s.submitted_at })),
    questions: panel.questions.map((q) => ({ id: q.id, school_id: q.school_id, question: q.question, word_limit: q.word_limit, status: q.status, outline: q.outline, latest_draft: q.latest?.body || '' })),
    applicant_profile: { current_role: prof.profile.current_role, company: prof.profile.company, roles_timeline: prof.profile.roles_timeline },
    stories: prof.stories.filter((s) => s.status === 'confirmed'),
    applicant_essays_for_these_schools: schoolEssays,
  };
}

// ---------- dashboard ----------
export async function getDashboard(user) {
  const uid = user.id;
  const [schools, prof, outlined] = await Promise.all([
    listSchools(uid),
    getProfile(uid),
    query(`SELECT 1 FROM mc_outlines o JOIN mc_essays e ON o.owner_type='essay' AND e.id=o.owner_id JOIN mc_schools s ON s.id=e.school_id WHERE s.user_id=$1 LIMIT 1`, [uid]),
  ]);
  const essays = schools.reduce((a, s) => ({ total: a.total + s.essays_total, final: a.final + s.essays_final }), { total: 0, final: 0 });
  const flags = [];
  for (const s of schools) {
    if (s.days_left !== null && s.days_left >= 0 && s.days_left <= 14 && !['ready', 'submitted', 'interview', 'admitted', 'waitlisted', 'rejected'].includes(s.status)) {
      flags.push({ level: s.days_left <= 7 ? 'high' : 'medium', text: `${s.name} is due in ${s.days_left} day${s.days_left === 1 ? '' : 's'}`, href: `/schools/${s.id}` });
    }
    if (s.days_left !== null && s.days_left >= 0 && s.days_left <= 10) {
      for (const n of s.recs_pending) flags.push({ level: 'medium', text: `${n} hasn't submitted for ${s.name} (${s.days_left} days left)`, href: '/recommenders' });
    }
  }
  const storiesConfirmed = prof.stories.filter((s) => s.status === 'confirmed').length;
  const steps = [
    { key: 'connect', label: 'Connect your Claude', done: !!user.claude_connected_at },
    { key: 'schools', label: 'Add your schools', done: schools.length > 0 },
    { key: 'profile', label: 'Build your profile from your CV', done: prof.stories.length > 0 },
    { key: 'confirm', label: 'Confirm your stories', done: storiesConfirmed > 0 },
    { key: 'essay', label: 'Plan your first essay', done: outlined.length > 0 },
  ];
  return {
    user: { name: user.name, username: user.username, is_demo: user.is_demo, claude_connected_at: user.claude_connected_at, claude_last_seen_at: user.claude_last_seen_at },
    schools, essays, flags, steps,
    profile_completeness: prof.completeness,
    stories_total: prof.stories.length, stories_confirmed: storiesConfirmed,
  };
}
