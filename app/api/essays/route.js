import { handler } from '@/lib/api';
import { json } from '@/lib/auth';
import { listEssays } from '@/lib/mc';
export const GET = handler(async ({ user }) => json({ groups: await listEssays(user.id) }));
