import { handler } from '@/lib/api';
import { json } from '@/lib/auth';
import { listPlans, createPlan } from '@/lib/plans';

export const GET = handler(async ({ teacher }) => json({ plans: await listPlans(teacher.id) }));
export const POST = handler(async ({ teacher, body }) => json({ plan: await createPlan(teacher.id, body, 'app') }));
