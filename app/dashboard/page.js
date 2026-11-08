import { redirect } from 'next/navigation';
import { currentTeacher } from '@/lib/auth';
import Dashboard from '@/components/Dashboard';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const t = await currentTeacher();
  if (!t) redirect('/login');
  return <Dashboard />;
}
