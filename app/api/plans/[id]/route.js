import { handler } from '@/lib/api';
import { json } from '@/lib/auth';
import { getPlan, updatePlan, deletePlan } from '@/lib/plans';

export const GET = handler(async ({ teacher, params }) => json({ plan: await getPlan(teacher.id, params.id) }));
export const PATCH = handler(async ({ teacher, params, body }) => json({ plan: await updatePlan(teacher.id, params.id, body) }));
export const DELETE = handler(async ({ teacher, params }) => json(await deletePlan(teacher.id, params.id)));
