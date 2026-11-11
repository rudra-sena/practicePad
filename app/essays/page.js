import { requireUser } from '@/lib/page';
import Shell from '@/components/Shell';
import EssaysView from '@/components/EssaysView';
export const dynamic = 'force-dynamic';
export default async function Page() {
  await requireUser();
  return <Shell><EssaysView /></Shell>;
}
