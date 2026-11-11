import { requireUser } from '@/lib/page';
import Shell from '@/components/Shell';
import EssayPage from '@/components/EssayPage';
export const dynamic = 'force-dynamic';
export default async function Page({ params }) {
  await requireUser();
  const { id } = await params;
  return <Shell><EssayPage id={id} /></Shell>;
}
