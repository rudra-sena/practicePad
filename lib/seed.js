// Creates the demo teacher account (demo / practice123) with sample plans, once.
import crypto from 'crypto';

export const DEMO_USER = 'demo';
export const DEMO_PASS = 'practice123';

function hash(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(pw, salt, 32).toString('hex')}`;
}
const tok = (n = 9) => crypto.randomBytes(n).toString('base64url');

const SAMPLE = [
  {
    student_name: 'Ananya', instrument: 'Keyboard', level: 'Beginner', weeks: 2,
    goal: "Play 'Happy Birthday' with both hands for her dad's birthday in 2 weeks",
    notes: 'Short attention span, keep sessions under 20 minutes.',
    tasks: [
      [1, 'Find middle C and name the white keys', 'Say each note name out loud as you press it.', 5, true],
      [1, 'Right hand: first line of the melody', 'G G A G C B. Go slowly; accuracy before speed.', 10, true],
      [1, 'Right hand: full melody', 'Play the whole tune 5 times without stopping.', 10, false],
      [2, 'Left hand: three simple bass notes', 'C, G and F, one per bar.', 10, false],
      [2, 'Hands together, slowly', 'Use a metronome at 60 bpm.', 15, false],
      [2, 'Performance run', 'Play it for someone at home, start to finish.', 5, false],
    ],
  },
  {
    student_name: 'Rahul', instrument: 'Guitar', level: 'Beginner', weeks: 4,
    goal: 'Strum his first full song using 4 chords in 30 days',
    notes: 'Fingertips get sore; short sessions every day beat one long one.',
    tasks: [
      [1, 'Learn G and C chords', 'Hold each chord shape for 10 seconds, release, repeat.', 10, true],
      [1, 'Down-strum in time', '4 down-strums per bar at 70 bpm.', 10, true],
      [2, 'Learn D and Em chords', 'Same hold-and-release drill.', 10, true],
      [2, 'Switch between G and C', '1 minute of switching, count your clean changes.', 10, false],
      [3, 'Down-down-up-up-down-up pattern', 'Mute the strings and practise just the rhythm first.', 15, false],
      [4, 'Play the full song along with the recording', 'It is fine to miss chords; keep the strum going.', 15, false],
    ],
  },
  {
    student_name: 'Meera', instrument: 'Vocals', level: 'Beginner', weeks: 3,
    goal: 'Sing one song confidently and in tune at a family function in 3 weeks',
    notes: 'Gets nervous singing in front of people.',
    tasks: [
      [1, 'Breathing warm-up', 'Breathe in for 4 counts, hiss out for 8. Repeat 5 times.', 5, false],
      [1, 'Hum the tune along with the original', 'Hum only, no words, to lock the melody.', 10, false],
      [2, 'Sing with words, record yourself', 'Listen back and mark 2 lines that sound off.', 15, false],
      [2, 'Fix the 2 marked lines', 'Sing just those lines slowly 5 times each.', 10, false],
      [3, 'Sing for one family member', 'Full song, no stopping, even if you slip.', 10, false],
    ],
  },
];

export async function seedDemo(q) {
  const existing = await q('SELECT id FROM teachers WHERE username = $1', [DEMO_USER]);
  if (existing[0]) return;
  const rows = await q(
    `INSERT INTO teachers (username, password_hash, name, academy, api_key)
     VALUES ($1,$2,$3,$4,$5) ON CONFLICT (username) DO NOTHING RETURNING id`,
    [DEMO_USER, hash(DEMO_PASS), 'Demo Teacher', 'Sargam Music Studio', 'demo-' + tok(12)]
  );
  if (!rows[0]) return;
  const teacherId = rows[0].id;
  for (const p of SAMPLE) {
    const pr = await q(
      `INSERT INTO plans (teacher_id, student_name, instrument, level, goal, weeks, notes, share_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [teacherId, p.student_name, p.instrument, p.level, p.goal, p.weeks, p.notes, tok()]
    );
    for (const [i, [week, title, details, minutes, done]] of p.tasks.entries()) {
      await q(
        `INSERT INTO tasks (plan_id, week, position, title, details, minutes, done, done_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [pr[0].id, week, i, title, details, minutes, done, done ? new Date() : null]
      );
    }
  }
}
