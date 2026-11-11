import { handler } from '@/lib/api';
import { json } from '@/lib/auth';
import { getSchool, updateSchool, deleteSchool } from '@/lib/mc';
export const GET = handler(async ({ user, params }) => json({ school: await getSchool(user.id, params.id) }));
export const PATCH = handler(async ({ user, params, body }) => json({ school: await updateSchool(user.id, params.id, body) }));
export const DELETE = handler(async ({ user, params }) => json(await deleteSchool(user.id, params.id)));
