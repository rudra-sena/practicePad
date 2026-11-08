import { redirect } from 'next/navigation';
import { currentTeacher } from '@/lib/auth';
import PlanEditor from '@/components/PlanEditor';

export const dynamic = 'force-dynamic';

export default async function Page({ params }) {
  const t = await currentTeacher();
  if (!t) redirect('/login');
  const { id } = await params;
  return <PlanEditor planId={id} teacherName={t.name} />;
}
