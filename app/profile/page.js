import { requireUser } from '@/lib/page';
import Shell from '@/components/Shell';
import Profile from '@/components/Profile';
export const dynamic = 'force-dynamic';
export default async function Page() {
  await requireUser();
  return <Shell><Profile /></Shell>;
}
