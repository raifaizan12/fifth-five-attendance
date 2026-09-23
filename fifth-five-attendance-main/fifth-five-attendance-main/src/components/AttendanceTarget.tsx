"use client";

import { useState } from "react";

type Counts = { total: number; present: number; absent: number; late: number; leave: number };

export default function AttendanceTarget({ overallCounts }: { overallCounts: Counts }) {
  const [target, setTarget] = useState(75);

  const { present, late, absent } = overallCounts;
  const attended = present + late;
  const denom = attended + absent;
  const currentPct = denom > 0 ? (attended / denom) * 100 : 0;

  let neededClasses = 0;
  let canMiss = 0;

  if (denom === 0 || currentPct < target) {
    let a = attended, d = denom;
    while (d === 0 || (a / d) * 100 < target) {
      a += 1; d += 1; neededClasses += 1;
      if (neededClasses > 500) break;
    }
  } else {
    // Currently above target — figure out how many more can be missed and stay at/above target.
    let a = attended, d = denom;
    while (d + 1 > 0 && (a / (d + 1)) * 100 >= target) {
      d += 1; canMiss += 1;
      if (canMiss > 500) break;
    }
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ margin: 0 }}>🎯 Smart Attendance Target</h3>
        <div style={{ display: "flex", gap: 6 }}>
          {[75, 80, 90].map((t) => (
            <button
              key={t}
              onClick={() => setTarget(t)}
              className={`btn btn-sm ${target === t ? "btn-primary" : "btn-secondary"}`}
            >
              {t}%
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        {denom === 0 ? (
          <div className="hint">No attendance recorded yet — target will show once classes begin.</div>
        ) : currentPct >= target ? (
          <div className="success-text">
            You're at {Math.round(currentPct * 10) / 10}%, already above your {target}% target.
            {canMiss > 0 && (
              <div className="hint" style={{ marginTop: 4 }}>
                You can miss up to <strong>{canMiss}</strong> more class{canMiss === 1 ? "" : "es"} and stay at or above {target}%.
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="hint">
              You're at {Math.round(currentPct * 10) / 10}%, below your {target}% target.
            </div>
            <div style={{ marginTop: 4, color: "var(--amber-soft)" }}>
              Attend the next <strong>{neededClasses}</strong> class{neededClasses === 1 ? "" : "es"} in a row to reach {target}%.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
