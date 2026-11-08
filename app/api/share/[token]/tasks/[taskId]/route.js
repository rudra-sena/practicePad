import { handler } from '@/lib/api';
import { json } from '@/lib/auth';
import { setTaskDoneByShare } from '@/lib/plans';

export const POST = handler(async ({ params, body }) => json({ task: await setTaskDoneByShare(params.token, params.taskId, body.done) }), { open: true });
