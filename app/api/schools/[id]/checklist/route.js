import { handler } from '@/lib/api';
import { json } from '@/lib/auth';
import { addChecklistItem } from '@/lib/mc';
export const POST = handler(async ({ user, params, body }) => json(await addChecklistItem(user.id, params.id, body.label)));
