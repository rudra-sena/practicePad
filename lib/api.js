import { currentTeacher, json } from './auth';
import { AppError } from './plans';

// Wraps a route handler: requires login (unless open) and turns errors into JSON.
export function handler(fn, { open = false } = {}) {
  return async (req, ctx) => {
    try {
      const teacher = open ? null : await currentTeacher();
      if (!open && !teacher) return json({ error: 'Please log in.' }, 401);
      const params = ctx?.params ? await ctx.params : {};
      let body = {};
      if (['POST', 'PATCH', 'PUT'].includes(req.method)) body = await req.json().catch(() => ({}));
      return await fn({ req, teacher, params, body });
    } catch (e) {
      if (e instanceof AppError) return json({ error: e.message }, 400);
      console.error(e);
      return json({ error: 'Something went wrong. Please try again.' }, 500);
    }
  };
}
