// Shared recommender panel API. The applicant uses their session; the recommender uses their link token (?t=).
import { handler } from '@/lib/api';
import { json, currentUser } from '@/lib/auth';
import { recAccess, recPanel, addRecQuestion, updateRecQuestion, saveRecDraft, setRecSubmitted } from '@/lib/mc';

async function access(req, params) {
  const t = new URL(req.url).searchParams.get('t');
  const user = t ? null : await currentUser();
  return recAccess({ user, token: t, recId: params.id === 'token' ? null : params.id });
}

export const GET = handler(async ({ req, params }) => {
  const { rec, role } = await access(req, params);
  return json({ panel: await recPanel(rec, role) });
}, { open: true });

export const POST = handler(async ({ req, params, body }) => {
  const { rec, role } = await access(req, params);
  switch (body.action) {
    case 'add_question': await addRecQuestion(rec, body); break;
    case 'update_question': await updateRecQuestion(rec, body.question_id, body); break;
    case 'save_draft': await saveRecDraft(rec, body.question_id, body.text, role); break;
    case 'submitted': await setRecSubmitted(rec, body.school_id, body.submitted, role); break;
    default: return json({ error: 'Unknown action.' }, 400);
  }
  return json({ panel: await recPanel(rec, role) });
}, { open: true });
