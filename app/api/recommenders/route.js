import { handler } from '@/lib/api';
import { json } from '@/lib/auth';
import { listRecommenders, addRecommender } from '@/lib/mc';
export const GET = handler(async ({ user }) => json({ recommenders: await listRecommenders(user.id) }));
export const POST = handler(async ({ user, body }) => json({ recommender: await addRecommender(user.id, body) }));
