import { requireUser } from '@/lib/page';
import Shell from '@/components/Shell';
import Dashboard from '@/components/Dashboard';
export const dynamic = 'force-dynamic';
export default async function Page() {
  await requireUser();
  return <Shell><Dashboard /></Shell>;
}
