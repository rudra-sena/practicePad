import { Logo } from '@/components/Shell';
import { sessionUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const FEATURES = [
  ['Schools that fill themselves in', 'Ask your Claude to add ISB, INSEAD or any programme. Deadlines, essay prompts and checklists appear, with sources to verify.'],
  ['Your stories, organised once', 'Claude reads your CV and pulls out your experiences as stories. Fill the gaps with a few short answers.'],
  ['Plan, write, get reviewed', 'Claude builds the structure for each essay from your own stories. You write. Claude reviews every draft.'],
  ['A final check per school', 'When a school’s essays are final, Claude checks that application as a whole before you submit.'],
  ['Recommenders, without the WhatsApp chaos', 'Give your recommender one link with the questions, a shared outline and a place to draft.'],
  ['No AI inside, by design', 'Mastercraft runs no AI. Your own Claude does the thinking; Mastercraft keeps everything in one place.'],
];

export default async function Home() {
  const user = await sessionUserId().catch(() => null);
  return (
    <>
      <div className="nav">
        <div className="nav-in">
          <Logo />
          <div className="grow" />
          {user ? (
            <a className="btn" href="/dashboard">Open dashboard</a>
          ) : (
            <div className="row">
              <a href="/login" style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>Log in</a>
              <a className="btn" href="/login?mode=signup">Start free</a>
            </div>
          )}
        </div>
      </div>
      <div className="wrap">
        <div className="hero">
          <span className="pill jade">For MBA and master’s applicants</span>
          <h1 style={{ marginTop: 14 }}>Your whole application season, crafted in one place</h1>
          <p className="muted" style={{ fontSize: 17, maxWidth: 640 }}>
            Your own Claude researches each school, turns your CV into stories, plans every essay and reviews each draft.
            Mastercraft keeps your schools, essays, deadlines and recommenders together, live, all season.
          </p>
          <div className="row" style={{ marginTop: 18 }}>
            <a className="btn primary" href="/login">Try the demo</a>
            <a className="btn outline" href="/login?mode=signup">Create your account</a>
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>Demo login: <b>demo</b> / <b>mastercraft</b></p>
        </div>
        <div className="feature-grid">
          {FEATURES.map(([t, d]) => (
            <div key={t} className="card accent">
              <h3>{t}</h3>
              <p className="muted small" style={{ margin: 0 }}>{d}</p>
            </div>
          ))}
        </div>
        <p className="small faint" style={{ marginTop: 28 }}>Mastercraft helps you plan and review. Your essays stay your own words.</p>
      </div>
    </>
  );
}
