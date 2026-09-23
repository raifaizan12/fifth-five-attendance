"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Entry = {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  room?: string | null;
  subject: { id: string; name: string };
  teacher?: { id: string; fullName: string } | null;
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function isToday(day: string) {
  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  return day === todayName;
}

export default function StudentTimetablePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/timetable")
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error || `Failed to load timetable (${r.status})`);
        }
        return r.json();
      })
      .then((d) => setEntries(d.entries || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const byDay = DAYS.map((day) => ({ day, classes: entries.filter((e) => e.day === day) }));

  return (
    <div>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ marginTop: 0, marginBottom: 4 }}>Weekly Timetable</h3>
          <div className="hint">Fifth Five · BS IT · IUB</div>
        </div>
        <Link href="/portal">
          <button className="btn btn-secondary btn-sm">Back to My Attendance</button>
        </Link>
      </div>

      {loading ? (
        <div className="card">Loading timetable...</div>
      ) : error ? (
        <div className="card error-text">Couldn't load the timetable: {error}</div>
      ) : entries.length === 0 ? (
        <div className="card hint">No timetable has been added yet.</div>
      ) : (
        byDay.map(({ day, classes }) => (
          <div className="card" key={day} style={isToday(day) ? { borderColor: "var(--cyan-soft)" } : undefined}>
            <h3 style={{ marginTop: 0 }}>
              {day} {isToday(day) && <span className="badge badge-present">Today</span>}
            </h3>
            {classes.length === 0 ? (
              <div className="hint">No classes.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Subject</th>
                      <th>Teacher</th>
                      <th>Room</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((c) => (
                      <tr key={c.id}>
                        <td>
                          {c.startTime} – {c.endTime}
                        </td>
                        <td>{c.subject.name}</td>
                        <td>{c.teacher?.fullName || "—"}</td>
                        <td>{c.room || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
