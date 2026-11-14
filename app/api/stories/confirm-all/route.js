import { handler } from '@/lib/api';
import { json } from '@/lib/auth';
import { confirmAllStories } from '@/lib/mc';
export const POST = handler(async ({ user }) => json(await confirmAllStories(user.id)));
