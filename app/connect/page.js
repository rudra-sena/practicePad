import { requireUser } from '@/lib/page';
import Shell from '@/components/Shell';
import Connect from '@/components/Connect';
export const dynamic = 'force-dynamic';
export default async function Page() {
  await requireUser();
  return <Shell><Connect /></Shell>;
}
