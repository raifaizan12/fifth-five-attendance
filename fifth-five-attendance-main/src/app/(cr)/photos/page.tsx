"use client";

import { useEffect, useRef, useState } from "react";

type Photo = { id: string; caption?: string | null; order: number; imageData?: string };

// Resize/compress the picked image in the browser before uploading, so the
// request stays small and fast regardless of the original photo's size.
function resizeImage(file: File, maxWidth = 1280, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not read image"));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCaption, setEditingCaption] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/photos");
    const data = await res.json().catch(() => ({}));
    setPhotos(data.photos || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Please choose a photo first");
      return;
    }
    setUploading(true);
    try {
      const imageData = await resizeImage(file);
      const res = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: caption || undefined, imageData, order: photos.length }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }
      setMessage("Photo added.");
      setCaption("");
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function saveCaption(id: string) {
    const res = await fetch("/api/photos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, caption: editingCaption }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not update caption");
      return;
    }
    setEditingId(null);
    setEditingCaption("");
    setMessage("Slider caption updated.");
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this photo from the slider?")) return;
    await fetch(`/api/photos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    load();
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    const a = photos[index];
    const b = photos[target];
    // Swap their `order` values.
    await Promise.all([
      fetch("/api/photos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: a.id, order: b.order }),
      }),
      fetch("/api/photos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: b.id, order: a.order }),
      }),
    ]);
    load();
  }

  return (
    <div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>📸 Photo Slider Manager</h2>
        <p className="hint">Manage the photos that appear in the student portal homepage slider. Add, reorder, edit captions, or remove slides.</p>
        <h3>Add New Slide</h3>
        <form onSubmit={handleUpload}>
          <div className="field">
            <label>Photo</label>
            <input type="file" accept="image/*" ref={fileRef} required />
          </div>
          <div className="field">
            <label>Caption (optional)</label>
            <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. Farewell trip 2026" />
          </div>
          {error && <div className="error-text">{error}</div>}
          {message && <div className="success-text">{message}</div>}
          <button type="submit" className="btn btn-primary" disabled={uploading}>
            {uploading ? "Uploading..." : "Add Photo"}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Photos in Slider ({photos.length})</h3>
        <p className="hint">This slider appears at the top of the student portal.</p>
        {loading ? (
          <div className="hint">Loading...</div>
        ) : photos.length === 0 ? (
          <div className="hint">No photos yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginTop: 12 }}>
            {photos.map((p, i) => (
              <div key={p.id} className="card" style={{ margin: 0, padding: 10 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.imageData}
                  alt={p.caption || "Class photo"}
                  style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 8 }}
                />
                {editingId === p.id ? (
                  <div style={{ marginTop: 8 }}>
                    <input
                      value={editingCaption}
                      onChange={(e) => setEditingCaption(e.target.value)}
                      placeholder="Slide caption"
                      style={{ width: "100%" }}
                    />
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => saveCaption(p.id)}>Save</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="hint" style={{ marginTop: 6, minHeight: 18 }}>{p.caption || "No caption"}</div>
                    <button className="btn btn-secondary btn-sm" style={{ marginTop: 6 }} onClick={() => { setEditingId(p.id); setEditingCaption(p.caption || ""); }}>Edit Caption</button>
                  </>
                )}
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => move(i, -1)} disabled={i === 0}>
                    ↑
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => move(i, 1)} disabled={i === photos.length - 1}>
                    ↓
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

