import { handler } from '@/lib/api';
import { json } from '@/lib/auth';
import { schoolDecision } from '@/lib/mc';
export const POST = handler(async ({ user, params, body }) => json({ school: await schoolDecision(user.id, params.id, body.decision) }));
