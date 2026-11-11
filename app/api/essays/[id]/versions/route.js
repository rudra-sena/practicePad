import { handler } from '@/lib/api';
import { json } from '@/lib/auth';
import { saveEssayVersion } from '@/lib/mc';
export const POST = handler(async ({ user, params, body }) => json({ version: await saveEssayVersion(user.id, params.id, body.text) }));
