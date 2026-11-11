import RecommenderLink from '@/components/RecommenderLink';
export const metadata = { title: 'Recommendation workspace · Mastercraft' };
export default async function Page({ params }) {
  const { token } = await params;
  return <RecommenderLink token={token} />;
}
