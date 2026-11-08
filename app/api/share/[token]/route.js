import { handler } from '@/lib/api';
import { json } from '@/lib/auth';
import { getPlanByShare } from '@/lib/plans';

export const GET = handler(async ({ params }) => json({ plan: await getPlanByShare(params.token) }), { open: true });
