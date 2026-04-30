import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import {
  PLAN_WORD_LIMITS,
  getEffectivePlan,
  nextMonthStart,
} from "@/lib/plans";

const SYSTEM_PROMPTS: Record<string, string> = {
  standard:
    "Rewrite the following text to sound completely human-written. Use these techniques: vary sentence length dramatically (mix very short sentences with longer ones), start some sentences with conjunctions like And, But, So, or Because, add occasional filler phrases like honestly, to be fair, or the thing is, use contractions throughout, include a rhetorical question somewhere, make some sentences intentionally imperfect or conversational, avoid formal transitions like furthermore or moreover, use em dashes — like this — occasionally, vary paragraph length, and make it feel like a real person wrote it quickly. Do not make it sound polished or academic. Return only the rewritten text.",
  aggressive:
    "You are rewriting AI text to be completely undetectable. Follow these rules strictly: 1) Break up long sentences aggressively — no sentence should be longer than 15 words. 2) Add typos or self-corrections like I mean, or well actually. 3) Use very casual words like kinda, pretty much, stuff, things, gonna, wanna. 4) Add personal opinions like I think, in my opinion, honestly. 5) Start paragraphs with But, And, So, Look. 6) Use parentheses for side thoughts (which happens a lot in real writing). 7) Repeat a word occasionally for emphasis like really really or very very. 8) Include a small factual tangent or personal observation. 9) End with something casual or open-ended. 10) Never use words like furthermore, moreover, utilize, facilitate, leverage, or endeavor. Return only the rewritten text.",
  academic:
    "Rewrite this in a natural academic tone that sounds like a real student wrote it. Use slightly imperfect formal language, vary sentence structure, avoid overly perfect phrasing, include some hedging language like seems to or appears to, and make it sound genuinely human. Return only the rewritten text.",
};

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

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

  // ── Auth ────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Please sign in to use HumanizeIt." },
      { status: 401 }
    );
  }

  // ── Admin bypass — skip all usage checks ────────────────────────
  const ADMIN_EMAILS = ["martongalicza@gmail.com"];
  if (ADMIN_EMAILS.includes(user.email ?? "")) {
    const safeMode =
      typeof mode === "string" && mode in SYSTEM_PROMPTS ? mode : "standard";
    const temperature =
      safeMode === "aggressive" ? 0.9 : safeMode === "academic" ? 0.5 : 0.7;
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPTS[safeMode] },
          { role: "user", content: text.trim() },
        ],
        temperature,
      });
      return NextResponse.json({
        result: completion.choices[0]?.message?.content ?? "",
        wordsUsed: 0,
        wordLimit: Infinity,
        plan: "unlimited",
      });
    } catch (err: unknown) {
      console.error("[/api/humanize admin]", err);
      const message = err instanceof Error ? err.message : "Unexpected error from OpenAI.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // ── Load or create usage record ─────────────────────────────────
  let { data: usage } = await supabase
    .from("usage")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!usage) {
    const { data: created } = await supabase
      .from("usage")
      .upsert(
        {
          user_id: user.id,
          plan: "free",
          words_used: 0,
          words_reset_at: nextMonthStart(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();
    usage = created;
  }

  if (!usage) {
    return NextResponse.json({ error: "Could not load usage record." }, { status: 500 });
  }

  // ── Resolve effective plan (handles trial expiry) ────────────────
  const plan = getEffectivePlan(usage.plan, usage.trial_start_date);

  if (plan !== usage.plan) {
    await supabase
      .from("usage")
      .update({ plan: "free" })
      .eq("user_id", user.id);
    usage.plan = "free";
  }

  // ── Monthly reset for free / pro ────────────────────────────────
  if ((plan === "free" || plan === "pro") && usage.words_reset_at) {
    if (new Date(usage.words_reset_at) < new Date()) {
      const reset = nextMonthStart();
      await supabase
        .from("usage")
        .update({ words_used: 0, words_reset_at: reset })
        .eq("user_id", user.id);
      usage.words_used = 0;
    }
  }

  // ── Word limit check ────────────────────────────────────────────
  const wordLimit = PLAN_WORD_LIMITS[plan];
  const inputWords = countWords(text);
  const currentUsed = usage.words_used ?? 0;

  if (wordLimit !== Infinity && currentUsed + inputWords > wordLimit) {
    return NextResponse.json(
      {
        error: `You've reached your ${wordLimit.toLocaleString()}-word limit. Upgrade to continue.`,
        limitHit: true,
        plan,
        wordsUsed: currentUsed,
        wordLimit,
      },
      { status: 402 }
    );
  }

  // ── OpenAI call ─────────────────────────────────────────────────
  const safeMode =
    typeof mode === "string" && mode in SYSTEM_PROMPTS ? mode : "standard";
  const temperature =
    safeMode === "aggressive" ? 0.9 : safeMode === "academic" ? 0.5 : 0.7;

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPTS[safeMode] },
        { role: "user", content: text.trim() },
      ],
      temperature,
    });

    const result = completion.choices[0]?.message?.content ?? "";

    // ── Update usage ─────────────────────────────────────────────
    const newTotal = currentUsed + inputWords;
    await supabase
      .from("usage")
      .update({ words_used: newTotal })
      .eq("user_id", user.id);

    return NextResponse.json({
      result,
      wordsUsed: newTotal,
      wordLimit,
      plan,
    });
  } catch (err: unknown) {
    console.error("[/api/humanize]", err);
    const message =
      err instanceof Error ? err.message : "Unexpected error from OpenAI.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
