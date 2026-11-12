import { redirect } from 'next/navigation';
import { sessionUserId } from './auth';
export async function requireUser() {
  const id = await sessionUserId();
  if (!id) redirect('/login');
  return id;
}
