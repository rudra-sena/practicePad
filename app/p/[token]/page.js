import StudentView from '@/components/StudentView';

export const metadata = { title: 'My practice plan · PracticePad' };

export default async function Page({ params }) {
  const { token } = await params;
  return <StudentView token={token} />;
}
