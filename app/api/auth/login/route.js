import { handler } from '@/lib/api';
import { query } from '@/lib/db';
import { checkPassword, setSession, json } from '@/lib/auth';

export const POST = handler(async ({ body }) => {
  const rows = await query('SELECT id, password_hash FROM teachers WHERE username = $1', [String(body.username || '').trim().toLowerCase()]);
  if (!rows[0] || !checkPassword(String(body.password || ''), rows[0].password_hash)) {
    return json({ error: 'Wrong username or password.' }, 401);
  }
  await setSession(rows[0].id);
  return json({ ok: true });
}, { open: true });
