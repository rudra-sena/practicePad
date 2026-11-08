import { handler } from '@/lib/api';
import { json } from '@/lib/auth';
import { addTasks } from '@/lib/plans';

export const POST = handler(async ({ teacher, params, body }) => json({ plan: await addTasks(teacher.id, params.id, body.tasks) }));
