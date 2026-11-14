import { handler } from '@/lib/api';
import { json } from '@/lib/auth';
import { getEssayFull, updateEssayMeta, listStories, deleteEssay } from '@/lib/mc';
export const GET = handler(async ({ user, params }) => json({ ...(await getEssayFull(user.id, params.id)), stories: await listStories(user.id) }));
export const PATCH = handler(async ({ user, params, body }) => { await updateEssayMeta(user.id, params.id, body); return json({ ok: true }); });
export const DELETE = handler(async ({ user, params }) => json(await deleteEssay(user.id, params.id)));
