import { handler } from '@/lib/api';
import { query } from '@/lib/db';
import { hashPassword, setSession, token, json } from '@/lib/auth';

export const POST = handler(async ({ body }) => {
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  const name = String(body.name || '').trim().slice(0, 80);
  if (!name) return json({ error: 'Add your name.' }, 400);
  if (!/^[a-z0-9_.-]{3,30}$/.test(username)) return json({ error: 'Username: 3 to 30 letters, numbers, dots or dashes.' }, 400);
  if (password.length < 6) return json({ error: 'Password must be at least 6 characters.' }, 400);
  if ((await query('SELECT 1 FROM mc_users WHERE username = $1', [username]))[0]) return json({ error: 'That username is taken.' }, 400);
  const rows = await query('INSERT INTO mc_users (username, password_hash, name, api_key) VALUES ($1,$2,$3,$4) RETURNING id', [username, hashPassword(password), name, token(18)]);
  await setSession(rows[0].id);
  return json({ ok: true });
}, { open: true });
