"use client";

import { FormEvent, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };
const starters = [
  "Make a 5-day study plan for my upcoming exams.",
  "Explain a difficult IT concept in simple terms.",
  "Turn my lecture notes into practice questions.",
];

export default function AcademicAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I can help you plan study sessions, understand concepts, and create practice questions. For accurate course-specific answers, include your subject and paste the relevant notes." },
  ]);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(text = prompt) {
    const clean = text.trim();
    if (!clean || busy) return;
    const next: Message[] = [...messages, { role: "user", content: clean }];
    setMessages(next);
    setPrompt("");
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/ai-assistant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-8).map(({ role, content }) => ({ role, content })) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The assistant could not respond.");
      setMessages((current) => [...current, { role: "assistant", content: data.answer }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void send(); }

  return <main className="page smart-assistant-page">
    <section className="assistant-hero">
      <div><span className="assistant-kicker">SMART CAMPUS · AI WORKSPACE</span><h1>Your academic copilot<span>.</span></h1><p>Plan study sessions, practise concepts, and organise your learning in one place.</p></div>
      <div className="assistant-orb" aria-hidden="true">✦</div>
    </section>
    <section className="assistant-layout">
      <div className="card assistant-chat-card">
        <div className="assistant-chat-head"><div className="assistant-avatar">✦</div><div><strong>Academic Assistant</strong><div className="hint">Study support · Always verify important course details</div></div><span className="assistant-status"><i/> Ready</span></div>
        <div className="assistant-messages" aria-live="polite">{messages.map((message, index) => <div key={`${index}-${message.role}`} className={`assistant-message ${message.role}`}><span className="assistant-message-label">{message.role === "user" ? "YOU" : "ASSISTANT"}</span><p>{message.content}</p></div>)}{busy && <div className="assistant-message assistant"><span className="assistant-message-label">ASSISTANT</span><p className="assistant-thinking">Thinking<span> · · ·</span></p></div>}</div>
        {error && <div className="assistant-error" role="alert">{error}</div>}
        <form className="assistant-composer" onSubmit={submit}><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ask a question or paste a short section of your notes…" rows={3} maxLength={4000} /><div className="assistant-composer-bottom"><span>{prompt.length}/4000 · Don't include passwords or private information.</span><button className="btn btn-primary" type="submit" disabled={busy || !prompt.trim()}>{busy ? "Working…" : "Ask assistant ↗"}</button></div></form>
      </div>
      <aside className="assistant-side">
        <div className="card"><div className="assistant-side-icon">✧</div><h3>Try asking</h3><p className="hint">Choose a starter or write your own prompt.</p><div className="assistant-starters">{starters.map((starter) => <button key={starter} type="button" onClick={() => void send(starter)} disabled={busy}>{starter}<span>↗</span></button>)}</div></div>
        <div className="card assistant-responsible"><h3>Use AI thoughtfully</h3><ul><li>Check answers against your lecture notes and teacher guidance.</li><li>Don't submit generated work without understanding it.</li><li>AI responses may be incorrect and are not official university instructions.</li></ul></div>
      </aside>
    </section>
  </main>;
}
