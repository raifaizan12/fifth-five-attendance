"use client";

import { useEffect, useState } from "react";

type Log = { id: string; action: string; affectedType: string; details?: string | null; createdAt: string; actor: string };

export default function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/audit").then((r) => r.json()).then((d) => { setLogs(d.logs || []); setLoading(false); });
  }, []);

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Audit Log</h3>
      <p className="hint">Record of important actions taken in the portal (attendance changes, student edits, imports, backups).</p>
      {loading ? "Loading..." : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date/Time</th><th>Action</th><th>Actor</th><th>Details</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{new Date(l.createdAt).toLocaleString()}</td>
                  <td>{l.action.replaceAll("_", " ")}</td>
                  <td>{l.actor}</td>
                  <td>{l.details || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
