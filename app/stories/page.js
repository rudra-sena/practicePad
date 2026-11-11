import { requireUser } from '@/lib/page';
import Shell from '@/components/Shell';
import Stories from '@/components/Stories';
export const dynamic = 'force-dynamic';
export default async function Page() {
  await requireUser();
  return <Shell><Stories /></Shell>;
}
