import { handler } from '@/lib/api';
import { json } from '@/lib/auth';
import { rawQuery } from '@/lib/db';
import { seedDemoContent } from '@/lib/seed';

export const POST = handler(async ({ user }) => {
  if (!user.is_demo) return json({ error: 'Only the demo account can be reset.' }, 400);
  const q = await rawQuery();
  await seedDemoContent(q, user.id);
  return json({ ok: true });
});
