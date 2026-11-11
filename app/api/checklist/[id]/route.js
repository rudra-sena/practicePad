import { handler } from '@/lib/api';
import { json } from '@/lib/auth';
import { setChecklistItem } from '@/lib/mc';
export const PATCH = handler(async ({ user, params, body }) => json(await setChecklistItem(user.id, params.id, body)));
