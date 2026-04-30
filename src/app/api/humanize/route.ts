import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const SYSTEM_PROMPTS: Record<string, string> = {
  standard:
    "You are a professional human writer. Rewrite the following text so it sounds 100% natural and human. Vary sentence length and structure. Use contractions. Add minor imperfections. Remove repetitive phrasing and stiff transitions. Make it flow like a real person wrote it. Do not change the core meaning. Return only the rewritten text, no commentary.",
  aggressive:
    "You are a professional human writer. Aggressively rewrite the following text so it sounds completely natural and human. Drastically vary sentence length and structure. Use contractions heavily. Add personality and slight informality. Break up long sentences. Remove all AI-sounding phrasing, stiff transitions, and robotic structure. Make it feel genuinely personal and conversational. Do not change the core meaning. Return only the rewritten text, no commentary.",
  academic:
    "You are a professional academic writer. Rewrite the following text so it sounds natural while maintaining a scholarly tone. Vary sentence length and structure. Use precise vocabulary without being stiff. Remove repetitive phrasing and overly formal transitions. Make it flow like a real academic person wrote it — knowledgeable but not robotic. Do not change the core meaning. Return only the rewritten text, no commentary.",
};

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not set. Add it to your .env.local file." },
      { status: 500 }
    );
  }

  let body: { text?: unknown; mode?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { text, mode } = body;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }

  const safeMode = typeof mode === "string" && mode in SYSTEM_PROMPTS ? mode : "standard";
  const systemPrompt = SYSTEM_PROMPTS[safeMode];
  const temperature = safeMode === "aggressive" ? 0.9 : safeMode === "academic" ? 0.5 : 0.7;

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text.trim() },
      ],
      temperature,
    });

    const result = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ result });
  } catch (err: unknown) {
    console.error("[/api/humanize]", err);
    const message = err instanceof Error ? err.message : "Unexpected error from OpenAI.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
