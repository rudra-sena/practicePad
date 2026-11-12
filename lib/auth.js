import crypto from 'crypto';
import { cookies } from 'next/headers';
import { query } from './db';

const COOKIE = 'mc_session';

function secret() {
  return (
    process.env.SESSION_SECRET ||
    crypto.createHash('sha256').update('mc:' + (process.env.DATABASE_URL || process.env.POSTGRES_URL || 'local-dev')).digest('hex')
  );
}

export function token(bytes = 12) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

export function checkPassword(pw, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(pw, salt, 32).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'));
}

function sign(id) {
  return crypto.createHmac('sha256', secret()).update(String(id)).digest('base64url');
}

export async function setSession(userId) {
  const jar = await cookies();
  jar.set(COOKIE, `${userId}.${sign(userId)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

// Verifies the signed cookie only (no database call); used to guard pages.
export async function sessionUserId() {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  const [id, sig] = raw.split('.');
  return id && sig === sign(id) ? Number(id) : null;
}

export async function currentUser() {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  const [id, sig] = raw.split('.');
  if (!id || sig !== sign(id)) return null;
  const rows = await query('SELECT id, username, name, api_key, is_demo, claude_connected_at, claude_last_seen_at FROM mc_users WHERE id = $1', [Number(id)]);
  return rows[0] || null;
}

export async function userByKey(key) {
  if (!key) return null;
  const rows = await query('SELECT id, username, name, api_key, is_demo, claude_connected_at FROM mc_users WHERE api_key = $1', [key]);
  return rows[0] || null;
}

export function json(data, status = 200) {
  return Response.json(data, { status });
}

export async function baseUrlFromHeaders(h) {
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000';
  const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}
