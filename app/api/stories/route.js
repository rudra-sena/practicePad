import { handler } from '@/lib/api';
import { json } from '@/lib/auth';
import { listStories, saveStory } from '@/lib/mc';
export const GET = handler(async ({ user }) => json({ stories: await listStories(user.id) }));
export const POST = handler(async ({ user, body }) => json({ story: await saveStory(user.id, body) }));
