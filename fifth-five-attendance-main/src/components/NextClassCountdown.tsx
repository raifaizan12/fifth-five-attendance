"use client";

import { useEffect, useState } from "react";

type Entry = {
  id: string;
  day: string;
  startTime: string; // "HH:MM"
  endTime: string;
  room?: string | null;
  subject: { name: string };
  teacher?: { fullName: string } | null;
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function nextOccurrence(entry: Entry, now: Date): Date {
  const targetDay = DAYS.indexOf(entry.day);
  const [h, m] = entry.startTime.split(":").map(Number);

  const candidate = new Date(now);
  candidate.setHours(h, m, 0, 0);

  let diffDays = (targetDay - now.getDay() + 7) % 7;
  if (diffDays === 0 && candidate <= now) diffDays = 7; // today's slot already passed
  candidate.setDate(candidate.getDate() + diffDays);
  return candidate;
}

function formatCountdown(ms: number) {
  if (ms <= 0) return "Starting now";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export default function NextClassCountdown({ entries }: { entries: Entry[] }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (entries.length === 0) {
    return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>⏳ Next Class</h3>
        <div className="hint">No timetable has been added yet.</div>
      </div>
    );
  }

  // Find the entry with the soonest upcoming occurrence.
  let best: { entry: Entry; at: Date } | null = null;
  for (const entry of entries) {
    const at = nextOccurrence(entry, now);
    if (!best || at < best.at) best = { entry, at };
  }
  if (!best) return null;

  const msLeft = best.at.getTime() - now.getTime();
  const isToday = best.at.toDateString() === now.toDateString();

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>⏳ Next Class</h3>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{best.entry.subject.name}</div>
          <div className="hint">
            {isToday ? "Today" : best.entry.day} · {best.entry.startTime} – {best.entry.endTime}
            {best.entry.room ? ` · ${best.entry.room}` : ""}
            {best.entry.teacher?.fullName ? ` · ${best.entry.teacher.fullName}` : ""}
          </div>
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            fontFamily: "Sora, sans-serif",
            color: "var(--cyan-soft)",
            whiteSpace: "nowrap",
          }}
        >
          {formatCountdown(msLeft)}
        </div>
      </div>
    </div>
  );
}
