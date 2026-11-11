// Demo account for evaluators: username demo / password mastercraft.
// Riya, a product analyst applying to three MBA programmes. All school data is illustrative.
import crypto from 'crypto';

export const DEMO_USER = 'demo';
export const DEMO_PASS = 'mastercraft';

function hash(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(pw, salt, 32).toString('hex')}`;
}
const tok = (n = 12) => crypto.randomBytes(n).toString('base64url');
const words = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0);
const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const ISB_E1_V1 = `I want to lead product for financial services that reach India's small businesses. Over the last four years I have seen how a single broken step in a payments flow can lock a shop owner out of credit for months. At Paywise I rebuilt our KYC funnel and cut drop-offs by a third. That work taught me how much good product thinking can change outcomes for people who are usually an afterthought.

I want an MBA because I keep hitting the edges of what I know. I can read a funnel, but I can't yet build the business case that gets a CFO to fund the fix.`;

const ISB_E1_V2 = `Ramesh runs a hardware shop in Peenya. In 2024 he tried to sign up for a working-capital line through our app three times, and failed at the same KYC step each time. When I finally sat with him, I saw the problem was not the form. It was that the form assumed he had a PAN card linked to a mobile number he no longer used.

That afternoon changed what I want from my career. In the short term, I want to lead product for a lending or payments business serving small merchants, owning the whole journey rather than one analytics slice of it. In the long term, I want to build a company that makes formal credit as easy for a shop owner as a UPI payment is today.

At Paywise I rebuilt our KYC funnel with design and compliance, and cut drop-offs by 31 percent in two quarters. But I also learnt my limits. I could diagnose the funnel, yet I struggled to make the business case that would get our CFO to fund a fix across three products. I need the finance, strategy and leadership grounding that I cannot pick up on the job fast enough.

ISB's one-year format fits my timing, and its strength in financial inclusion is exactly where I want to grow. I want to work with the Centre for Digital Economy, and test my ideas with classmates from banking and consulting who will challenge my assumptions.

I want to leave ISB ready to own outcomes, not just analyse them, for people like Ramesh.`;

const ISB_E2_V1 = `In 2023 I led the migration of our analytics stack to a new warehouse. I promised the business three weeks. It took eleven. I underestimated how many dashboards depended on undocumented tables, and I did not ask for help until we were already late.`;

const ISB_E2_V2 = `In 2023 I volunteered to lead the migration of our analytics stack to a new data warehouse. I promised leadership three weeks. It took eleven, and for two of those weeks the sales team had no reliable numbers during a quarter close.

The failure was mine. I had mapped the tables but not the people who depended on them, and I kept quiet for too long because I wanted to fix it myself. When the head of sales escalated, I finally called a reset meeting, owned the slip, and split the work into three tracks with clear owners and a daily fifteen-minute check-in.

We finished, and the new stack cut report run-times by 70 percent. More importantly, I changed how I work. I now map stakeholders before systems, and I raise risks the week I see them, not the week they explode. When I led our KYC rebuild a year later, I shared a risk log with compliance on day one, and we shipped on time.`;

const REC_Q1_DRAFT = `Riya is among the top two analysts I have managed in eight years. Most analysts answer the question they are given; Riya asks whether it is the right question. When our KYC drop-offs rose in 2024, she did not stop at the dashboard. She sat with merchants, found that the mobile-linking step was the real issue, and worked with compliance to redesign it. Drop-offs fell by 31 percent within two quarters.`;

export async function seedDemo(q) {
  const existing = await q('SELECT id FROM mc_users WHERE username = $1', [DEMO_USER]);
  if (existing[0]) return;
  const rows = await q(
    `INSERT INTO mc_users (username, password_hash, name, api_key, is_demo) VALUES ($1,$2,$3,$4,true)
     ON CONFLICT (username) DO NOTHING RETURNING id`,
    [DEMO_USER, hash(DEMO_PASS), 'Riya Sharma', 'demo-' + tok(12)]
  );
  if (rows[0]) await seedDemoContent(q, rows[0].id);
}

export async function seedDemoContent(q, uid) {
  await q('DELETE FROM mc_schools WHERE user_id = $1', [uid]);
  await q('DELETE FROM mc_stories WHERE user_id = $1', [uid]);
  await q('DELETE FROM mc_answers WHERE user_id = $1', [uid]);
  await q('DELETE FROM mc_recommenders WHERE user_id = $1', [uid]);
  await q('DELETE FROM mc_profiles WHERE user_id = $1', [uid]);

  await q(
    `INSERT INTO mc_profiles (user_id, "current_role", company, years_experience, industry, education, test_scores, target_degree, target_intake, roles_timeline, skills, achievements, activities)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [uid, 'Product Analyst', 'Paywise (fintech, Bengaluru)', '4', 'Fintech, payments and lending', 'B.Tech, Computer Science, 2021',
      'GMAT Focus 675', 'MBA', '2027 intake',
      'Paywise: Product Analyst, 2023 to present\nTechlane Consulting: Business Analyst, 2021 to 2023',
      'SQL, product analytics, experimentation, stakeholder management',
      'Paywise "Customer First" award 2024; KYC funnel rebuild cut drop-offs 31%',
      'Weekend coding classes for girls in my apartment block; amateur Carnatic vocalist']
  );

  const answers = [
    ['short_term_goal', 'What do you want to do right after your degree?', 'Lead product for a lending or payments business that serves small merchants.'],
    ['long_term_goal', 'Where do you see yourself in about 10 years?', 'Build my own company that makes formal credit as easy for a shop owner as a UPI payment.'],
    ['why_now', 'Why is now the right time for this degree?', 'I can diagnose problems but cannot yet build the business case or lead across functions. I keep hitting that ceiling.'],
    ['values', 'What do you care about most, and where does that come from?', 'Fairness in access. My father ran a small shop and was refused credit twice.'],
  ];
  for (const [k, qq, a] of answers) await q('INSERT INTO mc_answers (user_id, question_key, question, answer, source) VALUES ($1,$2,$3,$4,$5)', [uid, k, qq, a, 'chat']);

  const stories = [
    ['Rebuilt the KYC drop-off funnel', 'Merchant sign-ups for credit were failing at the KYC step; drop-off had risen to 42%.', 'Interviewed merchants, found the mobile-linking step was the real blocker, and redesigned it with design and compliance.', 'Drop-offs fell 31% in two quarters; won the Customer First award.', 'leadership,impact', 'Paywise, Product Analyst', '2024', 'confirmed'],
    ['Launched UPI autopay for SME repayments', 'Small merchants were missing EMI dates because repayments were manual.', 'Proposed and scoped UPI autopay for repayments, ran a pilot with 400 merchants.', 'On-time repayments rose from 78% to 91% in the pilot; rolled out to all merchants.', 'initiative,impact', 'Paywise, Product Analyst', '2025', 'confirmed'],
    ['Pushed back on the sales head’s pricing pilot', 'Sales wanted to cut processing fees for all new merchants to boost sign-ups.', 'Showed with cohort data that the cut would attract low-retention merchants; proposed a targeted pilot instead.', 'Targeted pilot kept margins and still grew sign-ups 12%.', 'teamwork', 'Paywise, Product Analyst', '2024', 'confirmed'],
    ['Analytics migration that ran eight weeks late', 'Led migration of the analytics stack; promised three weeks.', 'Underestimated dependencies and stayed silent too long; then reset the plan with three tracks and daily check-ins.', 'Finished in eleven weeks; run-times fell 70%; changed how I flag risks.', 'failure,leadership', 'Paywise, Product Analyst', '2023', 'confirmed'],
    ['Weekend coding classes for girls', 'Girls in my apartment block had no exposure to programming.', 'Started free weekend Scratch and Python classes.', '14 students over two years; two now study computer science.', 'personal,initiative', 'Outside work', '2022 to present', 'draft'],
    ['Mentored three junior analysts', 'New analysts were struggling with SQL and stakeholder requests.', '', '', 'leadership', 'Paywise', '2025', 'needs_detail'],
  ];
  const sid = [];
  for (const s of stories) {
    const r = await q(`INSERT INTO mc_stories (user_id, title, situation, action, result, themes, role_context, period, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`, [uid, ...s]);
    sid.push(r[0].id);
  }

  const note = 'Demo data: essay prompts and deadlines are illustrative, not the school’s official questions.';
  const addSchool = async (name, program, round, days, fee, notes, essays, checklist, doneCount) => {
    const r = await q(`INSERT INTO mc_schools (user_id, name, program, round, deadline, fee, notes, sources, data_note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [uid, name, program, round, inDays(days), fee, notes, '', note]);
    const ids = [];
    for (const [i, e] of essays.entries()) {
      const er = await q('INSERT INTO mc_essays (school_id, title, prompt, word_limit, position) VALUES ($1,$2,$3,$4,$5) RETURNING id', [r[0].id, e[0], e[1], e[2], i]);
      ids.push(er[0].id);
    }
    for (const [i, c] of checklist.entries()) await q('INSERT INTO mc_checklist (school_id, label, done, position) VALUES ($1,$2,$3,$4)', [r[0].id, c, i < doneCount, i]);
    return { id: r[0].id, essays: ids };
  };

  const isb = await addSchool('ISB', 'PGP (one-year MBA)', 'Round 2', 24, '₹ demo',
    'One-year programme; strong in financial inclusion and digital economy; diverse class with many engineers moving into business roles.',
    [['Essay 1', 'What are your short-term and long-term career goals, and how will this programme help you achieve them?', 400],
     ['Essay 2', 'Describe a setback you faced and what you learned from it.', 300]],
    ['Test score report', 'Transcripts', 'One-page CV', 'Two recommendations', 'Application fee', 'Video introduction'], 4);
  const insead = await addSchool('INSEAD', 'MBA', 'Round 3', 38, '€ demo',
    'Ten-month, highly international programme; values cross-cultural experience and languages.',
    [['Essay 1', 'Describe your current job and how your responsibilities have grown.', 300],
     ['Essay 2', 'Tell us about a time you worked effectively across cultures.', 300]],
    ['Test score report', 'Transcripts', 'CV', 'Two recommendations', 'Language certificate', 'Application fee'], 1);
  await addSchool('Kellogg', 'Two-year MBA', 'Round 2', 52, '$ demo',
    'Known for collaborative culture and marketing; looks for leaders who create value with others.',
    [['Essay 1', 'Describe a time you led others to create lasting value.', 450],
     ['Essay 2', 'What values guide you, and how have they shaped your path?', 450]],
    ['Test score report', 'Transcripts', 'Résumé', 'Two recommendations', 'Video essays', 'Application fee'], 0);

  const ver = async (type, id, n, body, by) => q('INSERT INTO mc_versions (owner_type, owner_id, version, body, word_count, edited_by) VALUES ($1,$2,$3,$4,$5,$6)', [type, id, n, body, words(body), by]);
  const outline = async (type, id, storyId, reason, angle, sections, ending, by = 'claude') =>
    q('INSERT INTO mc_outlines (owner_type, owner_id, version, story_id, story_reason, angle, sections, ending, edited_by) VALUES ($1,$2,1,$3,$4,$5,$6,$7,$8)', [type, id, storyId, reason, angle, JSON.stringify(sections), ending, by]);
  const review = async (essayId, v, overall, strengths, fixes, fact) =>
    q('INSERT INTO mc_reviews (essay_id, version, overall, strengths, fixes, fact_check) VALUES ($1,$2,$3,$4,$5,$6)', [essayId, v, overall, JSON.stringify(strengths), JSON.stringify(fixes), fact]);

  // ISB Essay 1: final
  await outline('essay', isb.essays[0], sid[0], 'Shows the problem you want to solve, first-hand, with measurable impact.',
    'Open with one real merchant to make the goal concrete.',
    [{ heading: 'Opening scene', points: ['Ramesh fails KYC three times', 'You discover the real blocker'], facts: ['Peenya hardware shop', 'mobile-linking step'], words: 70 },
     { heading: 'Goals', points: ['Short term: lead product for SME lending or payments', 'Long term: build a company for merchant credit'], facts: ['saved goals in profile'], words: 90 },
     { heading: 'Proof and gap', points: ['KYC rebuild result', 'Could not make the business case to the CFO'], facts: ['31% fewer drop-offs'], words: 110 },
     { heading: 'Why ISB', points: ['One-year timing', 'Financial inclusion focus', 'Peer learning'], facts: [], words: 90 }],
    'Close by returning to Ramesh: owning outcomes, not just analysing them.');
  await ver('essay', isb.essays[0], 1, ISB_E1_V1, 'applicant');
  await review(isb.essays[0], 1, 'The goal is clear but the essay tells rather than shows. It reads like a summary of your CV.',
    ['Clear short-term goal', 'Honest about the skill gap'],
    [{ where: 'Opening', issue: 'Starts with a statement of intent; nothing to picture.', suggestion: 'Open with the merchant you sat with, as your outline planned.' },
     { where: 'Overall', issue: 'Long-term goal and Why ISB are missing.', suggestion: 'Add both, using the word budget in the outline.' }],
    'Facts match your profile.');
  await ver('essay', isb.essays[0], 2, ISB_E1_V2, 'applicant');
  await review(isb.essays[0], 2, 'Much stronger. The opening earns attention and the goals follow naturally from the story.',
    ['Vivid, specific opening', 'Goals are concrete and linked to experience', 'Gap and Why ISB are credible'],
    [{ where: 'Why ISB paragraph', issue: 'Centre name is generic.', suggestion: 'Check the exact centre or course name on ISB’s site and add one specific course.' }],
    'Facts match your profile: 31% drop-off reduction, four years’ experience.');
  await q(`UPDATE mc_essays SET status = 'final' WHERE id = $1`, [isb.essays[0]]);

  // ISB Essay 2: reviewed, not final (evaluators can mark it final to trigger the final check)
  await outline('essay', isb.essays[1], sid[3], 'A real failure you owned, with a clear change in behaviour afterwards.',
    'Own the miss in the first two sentences, then show what changed.',
    [{ heading: 'The setback', points: ['Promised three weeks, took eleven', 'Sales flew blind during quarter close'], facts: ['3 weeks vs 11 weeks'], words: 70 },
     { heading: 'What you did', points: ['Owned it in a reset meeting', 'Three tracks, daily check-ins'], facts: [], words: 90 },
     { heading: 'What changed', points: ['Map people before systems', 'Raise risks early', 'Proof: KYC project shipped on time'], facts: ['70% faster reports'], words: 110 }],
    'End on the habit you now practise, with proof.');
  await ver('essay', isb.essays[1], 1, ISB_E2_V1, 'applicant');
  await ver('essay', isb.essays[1], 2, ISB_E2_V2, 'applicant');
  await review(isb.essays[1], 2, 'Honest and well structured. The learning is specific and proven by a later project.',
    ['You own the failure early', 'Concrete change in behaviour', 'Proof from the KYC project'],
    [{ where: 'Second paragraph', issue: '"The failure was mine" is strong but the cause is slightly vague.', suggestion: 'Name the one dependency you missed.' }],
    'Facts match your stories.');
  await q(`UPDATE mc_essays SET status = 'reviewed' WHERE id = $1`, [isb.essays[1]]);

  // INSEAD Essay 1: outlined only
  await outline('essay', insead.essays[0], sid[1], 'Shows growth from analyst to someone who proposes and launches products.',
    'Trace how your remit grew from analysis to owning a launch.',
    [{ heading: 'Where you started', points: ['Analyst answering requests'], facts: [], words: 80 },
     { heading: 'Turning point', points: ['UPI autopay proposal and pilot'], facts: ['400 merchants', '78% to 91% on-time'], words: 130 },
     { heading: 'Today', points: ['What you own now', 'What you want to own next'], facts: [], words: 90 }],
    'Land on the next step your MBA unlocks.');
  await q(`UPDATE mc_essays SET status = 'outlined' WHERE id = $1`, [insead.essays[0]]);

  // Recommender
  const rec = await q('INSERT INTO mc_recommenders (user_id, name, relationship, email, link_token) VALUES ($1,$2,$3,$4,$5) RETURNING id', [uid, 'Arjun Mehta', 'Current manager at Paywise', '', 'demo-arjun-' + tok(6)]);
  const rid = rec[0].id;
  await q('INSERT INTO mc_rec_schools (recommender_id, school_id) VALUES ($1,$2),($1,$3)', [rid, isb.id, insead.id]);
  const q1 = await q('INSERT INTO mc_rec_questions (recommender_id, school_id, question, word_limit, position, outline_final) VALUES ($1,$2,$3,$4,0,true) RETURNING id',
    [rid, isb.id, 'How does the candidate’s performance compare to others in similar roles? Please give examples.', 300]);
  const q2 = await q('INSERT INTO mc_rec_questions (recommender_id, school_id, question, word_limit, position) VALUES ($1,$2,$3,$4,1) RETURNING id',
    [rid, isb.id, 'Describe the most important piece of constructive feedback you have given the candidate.', 250]);
  await outline('rec_question', q1[0].id, sid[0], 'Arjun saw the KYC rebuild first-hand.',
    'Rank her clearly, then prove it with one example.',
    [{ heading: 'Comparison', points: ['Top two of analysts managed in eight years'], facts: ['8 years managing'], words: 60 },
     { heading: 'Example', points: ['KYC drop-offs: went beyond the dashboard to merchants', 'Worked with compliance'], facts: ['31% fewer drop-offs'], words: 150 },
     { heading: 'What sets her apart', points: ['Asks whether it is the right question'], facts: [], words: 80 }],
    'Close with readiness for a bigger role.');
  await ver('rec_question', q1[0].id, 1, REC_Q1_DRAFT, 'Arjun Mehta');
  await outline('rec_question', q2[0].id, sid[3], 'The migration is the clearest example of feedback she acted on.',
    'Name the feedback plainly, then show how she changed.',
    [{ heading: 'The feedback', points: ['Raise risks early; do not try to fix everything alone'], facts: ['analytics migration, 2023'], words: 90 },
     { heading: 'How she responded', points: ['Reset meeting, daily check-ins', 'Risk log shared on day one in the next project'], facts: [], words: 120 }],
    'End with the change you have seen since.');
}
