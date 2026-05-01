import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import {
  PLAN_WORD_LIMITS,
  getEffectivePlan,
  nextMonthStart,
} from "@/lib/plans";

// ── Stage 1: Rewrite in target mode ─────────────────────────────────────────
const SYSTEM_PROMPTS: Record<string, string> = {
  standard: `You are a human rewriting your own notes. Rewrite the text below so it sounds like a real person typed it out — not perfectly, but naturally. Follow these rules without exception:

- Mix sentence lengths aggressively. Some sentences should be 4 words. Others can run longer and wind around a bit before landing on the point, which is something real writers do without thinking about it.
- Do NOT start every sentence with "The" or "This". Vary openers: use "It", "That", "So", "There", "When", "What", casual phrases like "Honestly" or "Look".
- Use contractions naturally (it's, don't, they're, you'd) but not in every single sentence — that's also a giveaway.
- Avoid these words entirely: utilize, facilitate, leverage, moreover, furthermore, nevertheless, endeavor, commence, delve, underscore, multifaceted, nuanced, pivotal, realm, robust, transformative, streamline, cutting-edge, ever-evolving.
- Add at least one very short punchy sentence. Like this.
- Include one small concrete detail or example that grounds the writing in reality.
- One sentence can be slightly grammatically loose — the way people actually talk.
- Do not write a conclusion or summary sentence at the end. Just stop naturally.
- Return ONLY the rewritten text. No preamble, no explanation.`,

  aggressive: `You are rewriting AI-generated text to be completely undetectable by GPTZero and Turnitin. This is your only job. Follow every rule:

1. Maximum sentence length: 12 words. Break anything longer into two sentences.
2. Use casual vocabulary: kinda, pretty much, a lot, stuff, things, way more, not really, kind of.
3. Add personal voice: "I think", "honestly", "to me", "in my experience", "the way I see it".
4. Start at least 2 sentences with conjunctions: And, But, So, Because, Which.
5. Use parentheses for one side thought (like you're whispering something extra).
6. Include ONE deliberate self-correction or hedge: "well, sort of", "or maybe", "I mean".
7. Vary rhythm — cluster 3 short sentences together, then let one run a bit longer.
8. Zero formal transitions. No "however", "therefore", "consequently", "in contrast".
9. End mid-thought or with a question. Don't wrap it up neatly.
10. Banned words: utilize, facilitate, leverage, moreover, furthermore, endeavor, robust, pivotal, realm, delve, nuanced, multifaceted.
Return ONLY the rewritten text.`,

  academic: `Rewrite this as a real university student would write it — someone who is smart but not a professional writer. Rules:

- Use hedging language naturally: "seems to", "appears to", "could be argued", "it's worth noting", "this suggests".
- Vary formality slightly — mostly formal but with one or two slightly casual phrases that slip through.
- Avoid perfect parallel structure in lists — real students don't always write "First... Second... Third..."
- Include one slightly clunky sentence that a student would write when they're reaching for a big idea.
- Use "this" and "these" as sentence starters occasionally instead of always restating the noun.
- No conclusion sentence. Academic writing often ends on analysis, not summary.
- Banned words: utilize, facilitate, leverage, moreover, furthermore, endeavor, delve, multifaceted, pivotal, robust, nuanced, realm, underscore, transformative.
- Return ONLY the rewritten text.`,
};

// ── Stage 2: Perplexity boost — make word choices less predictable ───────────
const PERPLEXITY_PROMPT = `Your job is to increase the linguistic unpredictability of this text so it passes AI detectors. Do NOT change the meaning or structure significantly. Make these specific edits:

1. Find 4-6 places where the word choice is too expected or generic and replace with a more specific, unusual, or idiosyncratic word — something a particular human might say but an AI wouldn't predict.
2. Find one sentence that is too smooth and rhythmically perfect — break its rhythm slightly. Add a comma where there shouldn't be one, or remove one that should be there.
3. Find any place where three sentences in a row have similar length — change one of them dramatically (much shorter or longer).
4. If there are any lists or parallel structures, make one item in the list slightly inconsistent in form.
5. Add one tiny concrete sensory or situational detail somewhere that feels personal and specific.

Return ONLY the modified text. Do not explain your changes.`;

// ── Stage 3: Final humanization pass ────────────────────────────────────────
const FINAL_PASS_PROMPT = `Read this text and make these final micro-edits to make it pass GPTZero and Turnitin as human-written:

1. Remove any sentence that sounds like a conclusion, summary, or wrap-up.
2. Find the most "AI-sounding" sentence — the one that is too smooth, too balanced, or too perfectly phrased — and roughen it up or cut it entirely.
3. Check the opening sentence. If it starts with "The" or states the topic too cleanly, rewrite it to start differently.
4. Make sure no two consecutive sentences start with the same word.
5. If there are any em dashes (—), remove all but one. Real people don't use em dashes that often.
6. Check for any of these banned phrases and remove or replace them: "it is important to note", "it is worth noting", "in today's world", "in today's society", "in conclusion", "to summarize", "this essay", "this paper", "this text".

Return ONLY the final text. No commentary.`;

function buildSystemPrompt(basePrompt: string, writingSample: string | null): string {
  if (!writingSample) return basePrompt;
  return (
    `IMPORTANT: Before rewriting, analyze this writing sample carefully. Note the person's vocabulary level, average sentence length, tone, common phrases, and any quirks or patterns:\n\n"${writingSample}"\n\nNow rewrite the following text so it sounds like the SAME person who wrote that sample wrote this too. Match their style precisely.\n\n` +
    basePrompt
  );
}

function postProcess(text: string): string {
  let out = text;

  // Hard ban on AI words that slip through
  const hardBans: [RegExp, string][] = [
    [/\butilize[sd]?\b/gi, (m: string) => m[0] === m[0].toUpperCase() ? "Use" : "use"],
    [/\bfacilitate[sd]?\b/gi, (m: string) => m[0] === m[0].toUpperCase() ? "Help" : "help"],
    [/\bleverage[sd]?\b/gi, (m: string) => m[0] === m[0].toUpperCase() ? "Use" : "use"],
    [/\bmoreover\b/gi, (m: string) => m[0] === m[0].toUpperCase() ? "Also" : "also"],
    [/\bfurthermore\b/gi, (m: string) => m[0] === m[0].toUpperCase() ? "And" : "and"],
    [/\bnevertheless\b/gi, (m: string) => m[0] === m[0].toUpperCase() ? "Still" : "still"],
    [/\bendeavor[s]?\b/gi, (m: string) => m[0] === m[0].toUpperCase() ? "Try" : "try"],
    [/\bcommence[sd]?\b/gi, (m: string) => m[0] === m[0].toUpperCase() ? "Start" : "start"],
    [/\bdelve[sd]?\b/gi, (m: string) => m[0] === m[0].toUpperCase() ? "Get" : "get"],
    [/\bunderscore[sd]?\b/gi, (m: string) => m[0] === m[0].toUpperCase() ? "Show" : "show"],
    [/\bin today's (world|society)\b/gi, "these days"],
    [/\bit is important to note( that)?\b/gi, ""],
    [/\bIt is worth noting( that)?\b/g, ""],
    [/\bin conclusion\b/gi, ""],
    [/\bto summarize\b/gi, ""],
    [/\bin summary\b/gi, ""],
  ] as any;

  for (const [pattern, replacement] of hardBans) {
    if (typeof replacement === "function") {
      out = out.replace(pattern, replacement);
    } else {
      out = out.replace(pattern, replacement);
    }
  }

  // Fix double spaces and clean up
  out = out.replace(/\s{2,}/g, " ").trim();

  // Remove sentences that are pure conclusions
  out = out.replace(/[^.!?]*\b(in conclusion|to summarize|in summary|overall,?\s+this|this (essay|paper|text) (has|shows|demonstrates))\b[^.!?]*[.!?]\s*/gi, "");

  return out.trim();
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

async function runHumanizePipeline(
  client: OpenAI,
  text: string,
  mode: string,
  styleText: string | null,
  temperature: number
): Promise<string> {
  // Pass 1: Mode-specific rewrite
  const pass1 = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: buildSystemPrompt(SYSTEM_PROMPTS[mode], styleText) },
      { role: "user", content: text.trim() },
    ],
    temperature,
    frequency_penalty: 0.6,  // reduces repetitive phrasing
    presence_penalty: 0.4,   // encourages new topics/words
  });
  const pass1Text = pass1.choices[0]?.message?.content ?? text;

  // Pass 2: Perplexity boost
  const pass2 = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: PERPLEXITY_PROMPT },
      { role: "user", content: pass1Text },
    ],
    temperature: 0.85,
    frequency_penalty: 0.7,
  });
  const pass2Text = pass2.choices[0]?.message?.content ?? pass1Text;

  // Pass 3: Final cleanup
  const pass3 = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: FINAL_PASS_PROMPT },
      { role: "user", content: pass2Text },
    ],
    temperature: 0.5,
  });
  const pass3Text = pass3.choices[0]?.message?.content ?? pass2Text;

  return postProcess(pass3Text);
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not set." },
      { status: 500 }
    );
  }

  let body: { text?: unknown; mode?: unknown; writingSample?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { text, mode, writingSample } = body;
  const styleText = typeof writingSample === "string" && writingSample.trim() ? writingSample.trim() : null;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in to use HumanizeIt." }, { status: 401 });
  }

  const safeMode = typeof mode === "string" && mode in SYSTEM_PROMPTS ? mode : "standard";
  const temperature = safeMode === "aggressive" ? 0.95 : safeMode === "academic" ? 0.6 : 0.8;

  // ── Admin bypass ─────────────────────────────────────────────────
  const ADMIN_EMAILS = ["martongalicza@gmail.com"];
  if (ADMIN_EMAILS.includes(user.email ?? "")) {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const result = await runHumanizePipeline(client, text as string, safeMode, styleText, temperature);
      return NextResponse.json({ result, wordsUsed: 0, wordLimit: Infinity, plan: "unlimited" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // ── Load usage ───────────────────────────────────────────────────
  let { data: usage } = await supabase.from("usage").select("*").eq("user_id", user.id).single();

  if (!usage) {
    const { data: created } = await supabase
      .from("usage")
      .upsert({ user_id: user.id, plan: "free", words_used: 0, words_reset_at: nextMonthStart() }, { onConflict: "user_id" })
      .select().single();
    usage = created;
  }

  if (!usage) {
    return NextResponse.json({ error: "Could not load usage record." }, { status: 500 });
  }

  const plan = getEffectivePlan(usage.plan, usage.trial_start_date);
  if (plan !== usage.plan) {
    await supabase.from("usage").update({ plan: "free" }).eq("user_id", user.id);
    usage.plan = "free";
  }

  if ((plan === "free" || plan === "pro") && usage.words_reset_at) {
    if (new Date(usage.words_reset_at) < new Date()) {
      const reset = nextMonthStart();
      await supabase.from("usage").update({ words_used: 0, words_reset_at: reset }).eq("user_id", user.id);
      usage.words_used = 0;
    }
  }

  const wordLimit = PLAN_WORD_LIMITS[plan];
  const inputWords = countWords(text as string);
  const currentUsed = usage.words_used ?? 0;

  if (wordLimit !== Infinity && currentUsed + inputWords > wordLimit) {
    return NextResponse.json(
      { error: `You've reached your ${wordLimit.toLocaleString()}-word limit.`, limitHit: true, plan, wordsUsed: currentUsed, wordLimit },
      { status: 402 }
    );
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = await runHumanizePipeline(client, text as string, safeMode, styleText, temperature);

    const newTotal = currentUsed + inputWords;
    await supabase.from("usage").update({ words_used: newTotal }).eq("user_id", user.id);

    return NextResponse.json({ result, wordsUsed: newTotal, wordLimit, plan });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}