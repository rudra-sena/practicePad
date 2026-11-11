import { handler } from '@/lib/api';
import { json } from '@/lib/auth';
import { updateRecommender, deleteRecommender } from '@/lib/mc';
export const PATCH = handler(async ({ user, params, body }) => json(await updateRecommender(user.id, params.id, body)));
export const DELETE = handler(async ({ user, params }) => json(await deleteRecommender(user.id, params.id)));
