import { redirect } from 'next/navigation';
import { currentUser } from './auth';
export async function requireUser() {
  const u = await currentUser();
  if (!u) redirect('/login');
  return u;
}
