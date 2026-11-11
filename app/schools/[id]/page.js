import { requireUser } from '@/lib/page';
import Shell from '@/components/Shell';
import SchoolPage from '@/components/SchoolPage';
export const dynamic = 'force-dynamic';
export default async function Page({ params }) {
  await requireUser();
  const { id } = await params;
  return <Shell><SchoolPage id={id} /></Shell>;
}
