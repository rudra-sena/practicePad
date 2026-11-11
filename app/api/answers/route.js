import { handler } from '@/lib/api';
import { json } from '@/lib/auth';
import { saveAnswers, deleteAnswer } from '@/lib/mc';
export const PUT = handler(async ({ user, body }) => json({ saved: await saveAnswers(user.id, [body], 'app') }));
export const DELETE = handler(async ({ user, req }) => json(await deleteAnswer(user.id, new URL(req.url).searchParams.get('id'))));
