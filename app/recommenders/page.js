import { requireUser } from '@/lib/page';
import Shell from '@/components/Shell';
import Recommenders from '@/components/Recommenders';
export const dynamic = 'force-dynamic';
export default async function Page() {
  await requireUser();
  return <Shell><Recommenders /></Shell>;
}
