"use client";

type Entry = {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  room?: string | null;
  subject: { name: string };
  teacher?: { fullName: string } | null;
};

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export default function TodayClassCard({ entries }: { entries: Entry[] }) {
  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  const today = entries
    .filter((e) => e.day === todayName)
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>📅 Today's Classes</h3>
      <div className="hint" style={{ marginTop: -6, marginBottom: 10 }}>{todayName}</div>

      {today.length === 0 ? (
        <div className="hint">No classes scheduled today.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {today.map((e) => {
            const start = toMinutes(e.startTime);
            const end = toMinutes(e.endTime);
            const isCurrent = nowMinutes >= start && nowMinutes < end;
            const isNext = !isCurrent && start > nowMinutes && !today.some((o) => {
              const oStart = toMinutes(o.startTime);
              return oStart > nowMinutes && oStart < start;
            });

            return (
              <div
                key={e.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: isCurrent ? "rgba(52, 211, 153, 0.12)" : isNext ? "rgba(34, 211, 238, 0.1)" : "transparent",
                  border: isCurrent
                    ? "1px solid rgba(52, 211, 153, 0.4)"
                    : isNext
                    ? "1px solid rgba(34, 211, 238, 0.35)"
                    : "1px solid rgba(126,171,204,0.12)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {e.subject.name}
                    {isCurrent && <span className="badge badge-present" style={{ marginLeft: 8 }}>Now</span>}
                    {isNext && <span className="badge badge-late" style={{ marginLeft: 8 }}>Next</span>}
                  </div>
                  <div className="hint">
                    {e.startTime} – {e.endTime}
                    {e.room ? ` · ${e.room}` : ""}
                    {e.teacher?.fullName ? ` · ${e.teacher.fullName}` : ""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
