import { handler } from '@/lib/api';
import { json } from '@/lib/auth';
import { saveOutline } from '@/lib/mc';
export const POST = handler(async ({ user, body }) => json({ outline: await saveOutline(user.id, body.owner_type, body.owner_id, body, 'applicant') }));
