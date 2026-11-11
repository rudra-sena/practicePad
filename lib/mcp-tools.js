// The tools an applicant's own Claude can use. Claude does the thinking and writing;
// these tools only read and save data. No AI runs inside Mastercraft.
import * as mc from './mc';

const COACH = 'Mastercraft coaches; it never writes essays or recommendation letters for anyone. Never put essay prose into any tool.';

const sectionSchema = {
  type: 'object',
  properties: {
    heading: { type: 'string', description: 'Short label for this part of the essay, e.g. "Opening scene".' },
    points: { type: 'array', items: { type: 'string' }, description: 'What this part should cover, as short bullet points (not sentences of the essay).' },
    facts: { type: 'array', items: { type: 'string' }, description: 'Specific facts, numbers or names from the applicant to use here.' },
    words: { type: 'integer', description: 'Suggested word budget for this part.' },
  },
  required: ['heading', 'points'],
};

export const TOOLS = [
  {
    name: 'get_overview',
    title: 'Get application overview',
    description: 'See the whole application season: schools (with ids, rounds, deadlines, status), each school\'s essays (ids, status), recommenders (ids) and profile completeness. Call this before adding schools so you do not add duplicates, and whenever you need ids.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'add_school',
    title: 'Add a school',
    description:
      'Add one school the applicant is applying to, after researching it on the web (prefer the school\'s official admissions pages). Include the round deadline, essay prompts with word limits, required items as a checklist, a few school notes useful for "why this school" answers, and source links. If the current round is not announced, use last year\'s details and say so in data_note. If you cannot find something reliably, leave it out rather than guessing. Tell the applicant to verify on the official site.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'School name, e.g. "INSEAD".' },
        program: { type: 'string', description: 'Programme, e.g. "MBA" or "MS in Computer Science".' },
        round: { type: 'string', description: 'Round or intake, e.g. "Round 2".' },
        deadline: { type: 'string', description: 'Deadline as YYYY-MM-DD.' },
        fee: { type: 'string', description: 'Application fee with currency, if known.' },
        essays: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, prompt: { type: 'string' }, word_limit: { type: 'integer' } }, required: ['prompt'] } },
        checklist: { type: 'array', items: { type: 'string' }, description: 'Required items, e.g. "Test score report", "Two recommendations", "Video essay".' },
        notes: { type: 'string', description: '3 to 4 short notes: what the school is known for, specific programmes or values.' },
        sources: { type: 'array', items: { type: 'string' }, description: 'URLs you used.' },
        data_note: { type: 'string', description: 'Caveat, e.g. "Based on last year\'s prompts; current round not yet announced."' },
      },
      required: ['name', 'round'],
    },
  },
  {
    name: 'update_school',
    title: 'Update a school',
    description: 'Correct or update a school when the applicant asks: deadline, round, fee, notes, sources, status (in_progress, ready, submitted, interview, admitted, waitlisted, rejected), essay prompts or word limits (pass essays with id to edit, without id to add), or extra checklist items. Only send what changes.',
    inputSchema: {
      type: 'object',
      properties: {
        school_id: { type: 'integer' },
        name: { type: 'string' }, program: { type: 'string' }, round: { type: 'string' }, deadline: { type: 'string' }, fee: { type: 'string' },
        notes: { type: 'string' }, sources: { type: 'array', items: { type: 'string' } }, data_note: { type: 'string' },
        status: { type: 'string', enum: mc.SCHOOL_STATUSES },
        essays: { type: 'array', items: { type: 'object', properties: { id: { type: 'integer' }, title: { type: 'string' }, prompt: { type: 'string' }, word_limit: { type: 'integer' } } } },
        add_checklist: { type: 'array', items: { type: 'string' } },
      },
      required: ['school_id'],
    },
  },
  {
    name: 'get_profile',
    title: 'Get profile and stories',
    description: 'Get the applicant\'s profile, short answers, stories and which story themes are missing. It deliberately contains nothing about schools: use it to build or fill gaps in the profile without tailoring to any school.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'save_profile',
    title: 'Save profile facts',
    description: 'Save plain facts about the applicant, usually extracted from their CV: current role, company, years of experience, industry, education, test scores, target degree and intake, a timeline of roles, skills, achievements, activities. Record facts as given; do not embellish. Only send fields you have.',
    inputSchema: {
      type: 'object',
      properties: {
        current_role: { type: 'string' }, company: { type: 'string' }, years_experience: { type: 'string' }, industry: { type: 'string' },
        education: { type: 'string' }, test_scores: { type: 'string' }, target_degree: { type: 'string' }, target_intake: { type: 'string' },
        roles_timeline: { type: 'string', description: 'One role per line: company, title, years.' },
        skills: { type: 'string' }, achievements: { type: 'string' }, activities: { type: 'string' },
      },
    },
  },
  {
    name: 'save_story',
    title: 'Save a story',
    description: `Save one experience from the CV or conversation as a draft story: situation, what the applicant did, result, theme tags, role and period. Use only what the applicant gave you; if the CV only has a one-line result, save it with status "needs_detail". Themes: ${mc.THEMES.join(', ')}. Stories stay drafts until the applicant confirms them in the app.`,
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short title, e.g. "Rebuilt the KYC funnel".' },
        situation: { type: 'string' }, action: { type: 'string' }, result: { type: 'string' },
        themes: { type: 'array', items: { type: 'string', enum: mc.THEMES } },
        role_context: { type: 'string', description: 'Company and role at the time.' },
        period: { type: 'string', description: 'When, e.g. "2024".' },
        status: { type: 'string', enum: ['draft', 'needs_detail'] },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_story',
    title: 'Update a story',
    description: 'Add detail to or correct a story, for example after asking the applicant follow-up questions. Only send what changes. You cannot confirm stories; the applicant does that in the app.',
    inputSchema: {
      type: 'object',
      properties: {
        story_id: { type: 'integer' }, title: { type: 'string' }, situation: { type: 'string' }, action: { type: 'string' }, result: { type: 'string' },
        themes: { type: 'array', items: { type: 'string', enum: mc.THEMES } }, role_context: { type: 'string' }, period: { type: 'string' },
        status: { type: 'string', enum: ['draft', 'needs_detail'] },
      },
      required: ['story_id'],
    },
  },
  {
    name: 'save_answers',
    title: 'Save short answers',
    description: `Save the applicant's short answers to questions you asked in chat (goals, why now, values, setbacks, background...). Ask one short question at a time and keep answers to a line or two; never ask the applicant to write essay paragraphs in chat. Use question_key for the standard questions: ${mc.GAP_QUESTIONS.map((g) => g.key).join(', ')}.`,
    inputSchema: {
      type: 'object',
      properties: {
        answers: {
          type: 'array',
          items: { type: 'object', properties: { question_key: { type: 'string' }, question: { type: 'string' }, answer: { type: 'string' } }, required: ['answer'] },
        },
      },
      required: ['answers'],
    },
  },
  {
    name: 'get_essay',
    title: 'Get an essay with context',
    description: 'Get one essay with everything needed to plan or review it: prompt and word limit, school notes, latest draft (written by the applicant), current outline, previous review, profile, short answers, confirmed stories (with where each is already used) and the other essays for the same school.',
    inputSchema: { type: 'object', properties: { essay_id: { type: 'integer' } }, required: ['essay_id'] },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'save_outline',
    title: 'Save an outline',
    description: `Save a structure and plan for an essay (essay_id) or a recommendation question (rec_question_id). First shortlist 2 to 3 of the applicant's confirmed stories that fit the prompt, explain why in a line each, and let the applicant choose; ask at most 1 or 2 short questions for missing facts. The outline is bullet points, facts and word budgets, never essay sentences. ${COACH}`,
    inputSchema: {
      type: 'object',
      properties: {
        essay_id: { type: 'integer' },
        rec_question_id: { type: 'integer' },
        story_id: { type: 'integer', description: 'The story the applicant chose.' },
        story_reason: { type: 'string', description: 'One line on why this story fits.' },
        angle: { type: 'string', description: 'The opening angle or main idea, in one or two lines.' },
        sections: { type: 'array', items: sectionSchema },
        ending: { type: 'string', description: 'What the ending should land on.' },
      },
      required: ['sections'],
    },
  },
  {
    name: 'save_review',
    title: 'Save an essay review',
    description: `Save a holistic review of the applicant's latest draft (call get_essay first). Judge it as a whole: does it answer the prompt, is it specific and believable, does it follow or improve on the outline, opening and ending, word limit, and whether it is consistent with the other essays for the same school. Also check facts (numbers, dates, roles) against the profile and stories and report mismatches in fact_check. Give 2 to 3 strengths and 3 to 5 fixes, each pointing to where in the essay. Do not rewrite the essay. ${COACH}`,
    inputSchema: {
      type: 'object',
      properties: {
        essay_id: { type: 'integer' },
        version: { type: 'integer', description: 'Draft version you reviewed (defaults to latest).' },
        overall: { type: 'string' },
        strengths: { type: 'array', items: { type: 'string' } },
        fixes: { type: 'array', items: { type: 'object', properties: { where: { type: 'string' }, issue: { type: 'string' }, suggestion: { type: 'string' } }, required: ['issue'] } },
        fact_check: { type: 'string' },
      },
      required: ['essay_id', 'overall'],
    },
  },
  {
    name: 'get_school_application',
    title: 'Get one school\'s full application',
    description: 'Get everything for one school only, for the final check: all essays with their final text, recommendation outlines and drafts for that school, profile, short answers and confirmed stories. Never compare with other schools; each school only sees its own application.',
    inputSchema: { type: 'object', properties: { school_id: { type: 'integer' } }, required: ['school_id'] },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'save_school_check',
    title: 'Save the final check',
    description: 'Save the final check of one school\'s application. Check consistency across that school\'s essays and recommendations, facts against the profile, story repetition within the school, coverage of what the school values, and the one or two biggest risks. Severity: must_fix, consider or looks_good.',
    inputSchema: {
      type: 'object',
      properties: {
        school_id: { type: 'integer' },
        summary: { type: 'string' },
        findings: {
          type: 'array',
          items: { type: 'object', properties: { severity: { type: 'string', enum: ['must_fix', 'consider', 'looks_good'] }, area: { type: 'string' }, finding: { type: 'string' }, suggestion: { type: 'string' } }, required: ['severity', 'finding'] },
        },
      },
      required: ['school_id', 'findings'],
    },
  },
  {
    name: 'get_recommendation',
    title: 'Get a recommendation',
    description: 'Get a recommender\'s questions per school (with ids, word limits, outlines and drafts), the applicant\'s confirmed stories and role history, and the applicant\'s essay plans for those schools so the recommendation supports them. Use save_outline with rec_question_id to plan each answer. The recommender writes or approves the final words.',
    inputSchema: { type: 'object', properties: { recommender_id: { type: 'integer' } }, required: ['recommender_id'] },
    annotations: { readOnlyHint: true },
  },
];

export async function callTool(name, args, user, base) {
  const a = args || {};
  const uid = user.id;
  const link = (p) => `${base}${p}`;
  switch (name) {
    case 'get_overview': {
      const schools = await mc.listSchools(uid);
      const out = [];
      for (const s of schools) {
        const full = await mc.getSchool(uid, s.id);
        out.push({
          id: s.id, name: s.name, program: s.program, round: s.round, deadline: s.deadline, days_left: s.days_left, status: s.status, verified: s.verified,
          essays: full.essays.map((e) => ({ id: e.id, title: e.title, prompt: e.prompt, word_limit: e.word_limit, status: e.status })),
          link: link(`/schools/${s.id}`),
        });
      }
      const recs = await mc.listRecommenders(uid);
      const prof = await mc.getProfile(uid);
      return {
        applicant: user.name, schools: out,
        recommenders: recs.map((r) => ({ id: r.id, name: r.name, relationship: r.relationship, schools: r.schools.map((s) => s.name) })),
        profile_completeness: `${prof.completeness}%`, stories: prof.stories.length, dashboard: link('/dashboard'),
      };
    }
    case 'add_school': {
      const s = await mc.addSchool(uid, a);
      return { message: `Added ${s.name}. Ask the applicant to verify details on the official site.`, school_id: s.id, essays: s.essays.map((e) => ({ id: e.id, title: e.title })), link: link(`/schools/${s.id}`) };
    }
    case 'update_school': {
      const { school_id, ...rest } = a;
      const s = await mc.updateSchool(uid, school_id, rest);
      return { message: `Updated ${s.name}.`, link: link(`/schools/${s.id}`) };
    }
    case 'get_profile': {
      const p = await mc.getProfile(uid);
      return { ...p, missing_themes: p.coverage.filter((c) => !c.count).map((c) => c.theme), unanswered_questions: p.gap_questions.filter((g) => !g.answer).map((g) => ({ key: g.key, question: g.question })), link: link('/profile') };
    }
    case 'save_profile':
      await mc.saveProfile(uid, a);
      return { message: 'Profile saved.', link: link('/profile') };
    case 'save_story': {
      const s = await mc.saveStory(uid, a);
      return { message: 'Story saved as a draft. The applicant confirms it in the app.', story_id: s.id, link: link('/stories') };
    }
    case 'update_story': {
      const { story_id, ...rest } = a;
      await mc.updateStory(uid, story_id, rest, { byClaude: true });
      return { message: 'Story updated.', link: link('/stories') };
    }
    case 'save_answers': {
      const saved = await mc.saveAnswers(uid, a.answers, 'chat');
      return { message: `Saved ${saved.length} answer${saved.length === 1 ? '' : 's'}.`, link: link('/profile') };
    }
    case 'get_essay':
      return { ...(await mc.getEssayContext(uid, a.essay_id)), link: link(`/essays/${a.essay_id}`) };
    case 'save_outline': {
      if (a.essay_id) {
        const o = await mc.saveOutline(uid, 'essay', a.essay_id, a, 'claude');
        return { message: `Outline v${o.version} saved. The applicant writes the essay in Mastercraft using this plan.`, link: link(`/essays/${a.essay_id}`) };
      }
      if (a.rec_question_id) {
        const o = await mc.saveOutline(uid, 'rec_question', a.rec_question_id, a, 'claude');
        return { message: `Outline v${o.version} saved for the recommendation question. Either person can mark it final, then draft.`, link: link('/recommenders') };
      }
      throw new mc.AppError('Provide essay_id or rec_question_id.');
    }
    case 'save_review': {
      const r = await mc.saveReview(uid, a.essay_id, a);
      return { message: `Review saved against draft v${r.version}.`, link: link(`/essays/${a.essay_id}`) };
    }
    case 'get_school_application':
      return await mc.getSchoolApplication(uid, a.school_id);
    case 'save_school_check': {
      const r = await mc.saveSchoolCheck(uid, a.school_id, a);
      return { message: `Final check saved with ${r.findings} findings. The applicant sees it in the review window.`, link: link(`/schools/${a.school_id}`) };
    }
    case 'get_recommendation':
      return { ...(await mc.getRecommendationContext(uid, a.recommender_id)), link: link('/recommenders') };
    default:
      throw new mc.AppError(`Unknown tool: ${name}`);
  }
}
