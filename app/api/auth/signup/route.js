import { handler } from '@/lib/api';
import { query } from '@/lib/db';
import { hashPassword, setSession, token, json } from '@/lib/auth';

export const POST = handler(async ({ body }) => {
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  const name = String(body.name || '').trim().slice(0, 80);
  const academy = String(body.academy || '').trim().slice(0, 120);
  if (!/^[a-z0-9_.-]{3,30}$/.test(username)) return json({ error: 'Username: 3 to 30 letters, numbers, dots or dashes.' }, 400);
  if (password.length < 6) return json({ error: 'Password must be at least 6 characters.' }, 400);
  if (!name) return json({ error: 'Please add your name.' }, 400);
  const exists = await query('SELECT 1 FROM teachers WHERE username = $1', [username]);
  if (exists[0]) return json({ error: 'That username is taken.' }, 400);
  const rows = await query(
    'INSERT INTO teachers (username, password_hash, name, academy, api_key) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [username, hashPassword(password), name, academy, token(18)]
  );
  await setSession(rows[0].id);
  return json({ ok: true });
}, { open: true });
