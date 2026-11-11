import { handler } from '@/lib/api';
import { json } from '@/lib/auth';
import { getProfile, saveProfile } from '@/lib/mc';
export const GET = handler(async ({ user }) => json(await getProfile(user.id)));
export const PUT = handler(async ({ user, body }) => { await saveProfile(user.id, body); return json(await getProfile(user.id)); });
