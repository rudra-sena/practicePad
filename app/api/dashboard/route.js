import { handler } from '@/lib/api';
import { json } from '@/lib/auth';
import { getDashboard } from '@/lib/mc';
export const GET = handler(async ({ user }) => json(await getDashboard(user)));
