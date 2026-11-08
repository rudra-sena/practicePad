import Logo from '@/components/Logo';
import { currentTeacher } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const teacher = await currentTeacher().catch(() => null);
  return (
    <>
      <div className="nav">
        <Logo />
        <div className="row">
          {teacher ? (
            <a className="btn primary" href="/dashboard">Open dashboard</a>
          ) : (
            <>
              <a className="btn ghost" href="/login">Log in</a>
              <a className="btn primary" href="/login?mode=signup">Start free</a>
            </>
          )}
        </div>
      </div>
      <div className="wrap">
        <div className="hero narrow">
          <span className="pill brand">For music teachers and academies</span>
          <h1 style={{ marginTop: 12 }}>Your Claude writes the practice plan. PracticePad keeps it alive.</h1>
          <p className="muted" style={{ fontSize: 17 }}>
            Ask Claude for a plan like &ldquo;Get Rahul strumming his first song in 30 days&rdquo;. It lands in PracticePad as a
            week-by-week plan you can edit, with a live link your student uses to tick off practice. You see who is
            practising, and Claude can adjust the plan from their progress.
          </p>
          <div className="row" style={{ marginTop: 18 }}>
            <a className="btn primary" href="/login">Try the demo account</a>
            <a className="btn" href="/login?mode=signup">Create your studio</a>
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>Demo login: <b>demo</b> / <b>practice123</b></p>
        </div>

        <div className="feature-grid" style={{ marginTop: 30 }}>
          <div className="card">
            <h3>1. Ask your Claude</h3>
            <p className="muted">Connect PracticePad to Claude once. Then just ask: &ldquo;Make a 2-week keyboard plan for Ananya to play Happy Birthday.&rdquo;</p>
          </div>
          <div className="card">
            <h3>2. Edit and share</h3>
            <p className="muted">The plan appears in your dashboard. Tweak any task, then send the student their live link. No app download, no login for students.</p>
          </div>
          <div className="card">
            <h3>3. Track and adapt</h3>
            <p className="muted">Students tick tasks as they practise. Ask Claude &ldquo;Who is falling behind?&rdquo; or &ldquo;Rahul finished early, make week 3 harder.&rdquo;</p>
          </div>
        </div>

        <div className="card" style={{ marginTop: 24 }}>
          <h3>No AI inside, by design</h3>
          <p className="muted" style={{ marginBottom: 0 }}>
            PracticePad holds no AI keys and runs no models. Your own Claude does the thinking and writing; PracticePad does
            the saving, editing, sharing and tracking. You never pay twice for AI.
          </p>
        </div>
      </div>
    </>
  );
}
