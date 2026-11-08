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
  `CREATE TABLE IF NOT EXISTS teachers (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    academy TEXT,
    api_key TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    instrument TEXT NOT NULL,
    level TEXT DEFAULT 'Beginner',
    goal TEXT NOT NULL,
    weeks INTEGER DEFAULT 2,
    notes TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    share_token TEXT UNIQUE NOT NULL,
    created_via TEXT DEFAULT 'app',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    week INTEGER NOT NULL DEFAULT 1,
    position INTEGER NOT NULL DEFAULT 0,
    title TEXT NOT NULL,
    details TEXT DEFAULT '',
    minutes INTEGER DEFAULT 10,
    done BOOLEAN DEFAULT false,
    done_at TIMESTAMPTZ
  )`,
  `CREATE INDEX IF NOT EXISTS tasks_plan_idx ON tasks(plan_id)`,
  `CREATE INDEX IF NOT EXISTS plans_teacher_idx ON plans(teacher_id)`,
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
