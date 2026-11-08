import { handler } from '@/lib/api';
import { json } from '@/lib/auth';
import { updateTask, deleteTask } from '@/lib/plans';

export const PATCH = handler(async ({ teacher, params, body }) => json({ task: await updateTask(teacher.id, params.id, body) }));
export const DELETE = handler(async ({ teacher, params }) => json(await deleteTask(teacher.id, params.id)));
