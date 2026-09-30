"use client";

export default function BackupPage() {
  return (
    <div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Full Database Backup</h3>
        <p className="hint">Downloads a complete JSON snapshot of students, subjects, teachers, sessions, attendance records, and settings. Keep this safe — it can be used to restore your data.</p>
        <a href="/api/backup/export?format=json"><button className="btn btn-primary">Download Full Backup (JSON)</button></a>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Students Backup</h3>
        <p className="hint">Downloads all student records as a CSV file — the same format used for CSV import, so it doubles as a re-importable backup.</p>
        <a href="/api/backup/export?format=students-csv"><button className="btn btn-secondary">Download Students (CSV)</button></a>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Attendance Backup</h3>
        <p className="hint">Use the Reports page and click &quot;Export CSV&quot; (with no filters applied) to download all attendance records.</p>
        <a href="/reports"><button className="btn btn-secondary">Go to Reports</button></a>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Restore Instructions</h3>
        <p className="hint">
          This portal doesn&apos;t auto-restore a JSON backup (to avoid accidentally overwriting live data). To restore:
        </p>
        <ol className="hint" style={{ paddingLeft: 18 }}>
          <li>Re-import students via Students → Import CSV using your students backup.</li>
          <li>For a full database-level restore (e.g. after migrating to a new free database), use your database provider's dashboard to restore from a Postgres backup, or ask a developer to write the JSON back in with a small script using the same Prisma schema.</li>
          <li>See the README.md included in your project files for step-by-step database restore instructions specific to Neon/Supabase.</li>
        </ol>
      </div>
    </div>
  );
}
