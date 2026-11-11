// Database layer. In production (Vercel) it uses Postgres via DATABASE_URL.
// Locally, with no DATABASE_URL, it falls back to an embedded Postgres (PGlite).
import { seedDemo } from './seed';

let ready = null;

async function makeQuery() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (url) {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(url);
    return (text, params = []) => sql.query(text, params);
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite(process.env.PGLITE_DIR || './.pglite');
  return async (text, params = []) => (await db.query(text, params)).rows;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS mc_users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    claude_connected_at TIMESTAMPTZ,
    claude_last_seen_at TIMESTAMPTZ,
    is_demo BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS mc_profiles (
    user_id INTEGER PRIMARY KEY REFERENCES mc_users(id) ON DELETE CASCADE,
    "current_role" TEXT DEFAULT '', company TEXT DEFAULT '', years_experience TEXT DEFAULT '',
    industry TEXT DEFAULT '', education TEXT DEFAULT '', test_scores TEXT DEFAULT '',
    target_degree TEXT DEFAULT '', target_intake TEXT DEFAULT '',
    roles_timeline TEXT DEFAULT '', skills TEXT DEFAULT '', achievements TEXT DEFAULT '', activities TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS mc_answers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES mc_users(id) ON DELETE CASCADE,
    question_key TEXT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL DEFAULT '',
    source TEXT DEFAULT 'app',
    updated_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS mc_stories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES mc_users(id) ON DELETE CASCADE,
    title TEXT NOT NULL, situation TEXT DEFAULT '', action TEXT DEFAULT '', result TEXT DEFAULT '',
    themes TEXT DEFAULT '', role_context TEXT DEFAULT '', period TEXT DEFAULT '',
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS mc_schools (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES mc_users(id) ON DELETE CASCADE,
    name TEXT NOT NULL, program TEXT DEFAULT '', round TEXT DEFAULT '', deadline DATE,
    fee TEXT DEFAULT '', notes TEXT DEFAULT '', sources TEXT DEFAULT '', data_note TEXT DEFAULT '',
    verified BOOLEAN DEFAULT false, status TEXT DEFAULT 'in_progress',
    created_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS mc_checklist (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES mc_schools(id) ON DELETE CASCADE,
    label TEXT NOT NULL, done BOOLEAN DEFAULT false, position INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS mc_essays (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES mc_schools(id) ON DELETE CASCADE,
    title TEXT DEFAULT '', prompt TEXT NOT NULL, word_limit INTEGER,
    position INTEGER DEFAULT 0, status TEXT DEFAULT 'not_started',
    updated_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS mc_versions (
    id SERIAL PRIMARY KEY,
    owner_type TEXT NOT NULL, owner_id INTEGER NOT NULL,
    version INTEGER NOT NULL, body TEXT NOT NULL DEFAULT '', word_count INTEGER DEFAULT 0,
    edited_by TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS mc_outlines (
    id SERIAL PRIMARY KEY,
    owner_type TEXT NOT NULL, owner_id INTEGER NOT NULL,
    version INTEGER NOT NULL, story_id INTEGER, story_reason TEXT DEFAULT '',
    angle TEXT DEFAULT '', sections TEXT DEFAULT '[]', ending TEXT DEFAULT '',
    edited_by TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS mc_reviews (
    id SERIAL PRIMARY KEY,
    essay_id INTEGER NOT NULL REFERENCES mc_essays(id) ON DELETE CASCADE,
    version INTEGER NOT NULL, overall TEXT DEFAULT '', strengths TEXT DEFAULT '[]', fixes TEXT DEFAULT '[]',
    fact_check TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS mc_school_checks (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES mc_schools(id) ON DELETE CASCADE,
    summary TEXT DEFAULT '', findings TEXT DEFAULT '[]', created_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS mc_recommenders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES mc_users(id) ON DELETE CASCADE,
    name TEXT NOT NULL, relationship TEXT DEFAULT '', email TEXT DEFAULT '',
    link_token TEXT UNIQUE NOT NULL, created_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS mc_rec_schools (
    recommender_id INTEGER NOT NULL REFERENCES mc_recommenders(id) ON DELETE CASCADE,
    school_id INTEGER NOT NULL REFERENCES mc_schools(id) ON DELETE CASCADE,
    submitted_at TIMESTAMPTZ,
    PRIMARY KEY (recommender_id, school_id)
  )`,
  `CREATE TABLE IF NOT EXISTS mc_rec_questions (
    id SERIAL PRIMARY KEY,
    recommender_id INTEGER NOT NULL REFERENCES mc_recommenders(id) ON DELETE CASCADE,
    school_id INTEGER NOT NULL REFERENCES mc_schools(id) ON DELETE CASCADE,
    question TEXT NOT NULL, word_limit INTEGER, position INTEGER DEFAULT 0,
    outline_final BOOLEAN DEFAULT false, final BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS mc_versions_owner ON mc_versions(owner_type, owner_id)`,
  `CREATE INDEX IF NOT EXISTS mc_outlines_owner ON mc_outlines(owner_type, owner_id)`,
];

async function init() {
  const q = await makeQuery();
  for (const s of SCHEMA) await q(s);
  await seedDemo(q);
  return q;
}

export async function query(text, params = []) {
  if (!ready) ready = init().catch((e) => { ready = null; throw e; });
  const q = await ready;
  return q(text, params);
}

// Exposed for the demo reset.
export async function rawQuery() {
  if (!ready) ready = init();
  return ready;
}
