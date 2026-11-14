import { Logo } from '@/components/Shell';
import { sessionUserId } from '@/lib/auth';
import Carousel from '@/components/Carousel';

export const dynamic = 'force-dynamic';

const FEATURES = [
  ['Schools that fill themselves in', 'Name a school. Deadlines, essay prompts and checklists appear, with sources to check.'],
  ['Your stories, organised once', 'Your CV becomes a bank of stories you reuse across every essay.'],
  ['Plan, write, get reviewed', 'A plan for each essay from your own stories. You write. Every draft gets reviewed.'],
  ['A final check before you submit', 'When a school’s essays are final, the whole application is checked in one go.'],
  ['Recommenders in one link', 'Your recommender gets the questions, a shared outline and a place to draft.'],
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
        <Carousel items={FEATURES} />
        <p className="small faint" style={{ marginTop: 28 }}>Mastercraft helps you plan and review. Your essays stay your own words.</p>
      </div>
    </>
  );
}
