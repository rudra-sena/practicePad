import { handler } from '@/lib/api';
import { json } from '@/lib/auth';
import { updateStory, deleteStory } from '@/lib/mc';
export const PATCH = handler(async ({ user, params, body }) => json({ story: await updateStory(user.id, params.id, body) }));
export const DELETE = handler(async ({ user, params }) => json(await deleteStory(user.id, params.id)));
