import { handler } from '@/lib/api';
import { json } from '@/lib/auth';
import { setEssayFinal } from '@/lib/mc';
export const POST = handler(async ({ user, params, body }) => json(await setEssayFinal(user.id, params.id, !!body.final)));
