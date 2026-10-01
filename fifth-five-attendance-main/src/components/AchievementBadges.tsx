"use client";

type Props = {
  overallPercentage: number;
  currentStreak: number;
  longestStreak: number;
  totalPresent: number;
};

export default function AchievementBadges({ overallPercentage, currentStreak, longestStreak, totalPresent }: Props) {
  const badges = [
    {
      icon: "🏅",
      label: "Perfect Attendance",
      earned: overallPercentage >= 100,
      hint: "Reach 100% attendance",
    },
    {
      icon: "🔥",
      label: "7-Day Streak",
      earned: longestStreak >= 7,
      hint: "Attend 7 class-days in a row",
    },
    {
      icon: "⭐",
      label: "Consistent",
      earned: overallPercentage >= 90,
      hint: "Reach 90% attendance",
    },
    {
      icon: "✅",
      label: "On Track",
      earned: overallPercentage >= 75,
      hint: "Reach 75% attendance",
    },
    {
      icon: "💯",
      label: "50 Classes Attended",
      earned: totalPresent >= 50,
      hint: "Attend 50 classes total",
    },
  ];

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>🏆 Achievement Badges</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, marginTop: 10 }}>
        {badges.map((b) => (
          <div
            key={b.label}
            title={b.earned ? b.label : `Locked — ${b.hint}`}
            style={{
              textAlign: "center",
              padding: "14px 8px",
              borderRadius: 10,
              background: b.earned ? "rgba(34, 211, 238, 0.08)" : "rgba(126,171,204,0.05)",
              border: b.earned ? "1px solid rgba(34, 211, 238, 0.3)" : "1px solid rgba(126,171,204,0.12)",
              opacity: b.earned ? 1 : 0.45,
            }}
          >
            <div style={{ fontSize: 26 }}>{b.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>{b.label}</div>
            {!b.earned && <div className="hint" style={{ fontSize: 10, marginTop: 2 }}>{b.hint}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
