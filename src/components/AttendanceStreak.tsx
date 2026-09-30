"use client";

type Record = { date: string; status: string };

// A "class day" is broken if any session that day was ABSENT.
// PRESENT / LATE / LEAVE all count as keeping the streak alive.
export function computeStreak(records: Record[]) {
  const byDay = new Map<string, string[]>();
  for (const r of records) {
    const key = new Date(r.date).toISOString().slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(r.status);
  }

  const days = Array.from(byDay.entries())
    .map(([date, statuses]) => ({ date, broken: statuses.includes("ABSENT") }))
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first

  let streak = 0;
  for (const day of days) {
    if (day.broken) break;
    streak += 1;
  }

  // Longest streak ever, for context.
  let longest = 0;
  let running = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].broken) {
      running = 0;
    } else {
      running += 1;
      longest = Math.max(longest, running);
    }
  }

  return { current: streak, longest };
}

export default function AttendanceStreak({ records }: { records: Record[] }) {
  const { current, longest } = computeStreak(records);

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>🔥 Attendance Streak</h3>
      {current === 0 ? (
        <div className="hint">No active streak right now — attend your next class to start one.</div>
      ) : (
        <>
          <div style={{ fontSize: 30, fontWeight: 800, fontFamily: "Sora, sans-serif", color: "var(--amber-soft)" }}>
            {current} day{current === 1 ? "" : "s"}
          </div>
          <div className="hint" style={{ marginTop: 4 }}>
            {current === longest ? "That's your longest streak yet!" : `Longest so far: ${longest} days`}
          </div>
        </>
      )}
    </div>
  );
}
