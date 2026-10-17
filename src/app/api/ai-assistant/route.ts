import { NextRequest, NextResponse } from "next/server";
import { requireAnyUser } from "@/lib/apiAuth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { error } = await requireAnyUser();
  if (error) return error;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI assistant is not configured yet. Add OPENAI_API_KEY to your deployment environment, then redeploy." }, { status: 503 });
  }

  let body: { messages?: Array<{ role?: string; content?: string }> };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 8) {
    return NextResponse.json({ error: "Send between 1 and 8 recent messages." }, { status: 400 });
  }

  const messages = body.messages.map((item) => ({ role: item.role, content: typeof item.content === "string" ? item.content.trim() : "" }));
  if (messages.some((m) => !["user", "assistant"].includes(String(m.role)) || !m.content || m.content.length > 4000)) {
    return NextResponse.json({ error: "Messages must be valid and under 4,000 characters each." }, { status: 400 });
  }
  if (messages[messages.length - 1].role !== "user") return NextResponse.json({ error: "The latest message must be a user question." }, { status: 400 });

  try {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.4,
        max_tokens: 900,
        messages: [
          { role: "system", content: "You are a supportive academic study assistant inside a university class portal. Explain concepts clearly, encourage learning rather than plagiarism, help with study plans and practice questions, and say when you are uncertain. Do not claim to know official class details unless the user provides them. Never ask for passwords or sensitive personal data." },
          ...messages,
        ],
      }),
      signal: AbortSignal.timeout(25000),
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      const status = upstream.status === 429 ? 429 : 502;
      return NextResponse.json({ error: upstream.status === 429 ? "The AI service is busy. Please wait a moment and try again." : "The AI service could not complete this request. Please try again later." }, { status });
    }
    const answer = data?.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) return NextResponse.json({ error: "The assistant returned an empty response. Please try again." }, { status: 502 });
    return NextResponse.json({ answer: answer.trim() });
  } catch {
    return NextResponse.json({ error: "Could not reach the AI service. Check your connection and try again." }, { status: 502 });
  }
}
