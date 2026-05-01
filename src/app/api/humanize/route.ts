import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import {
  PLAN_WORD_LIMITS,
  getEffectivePlan,
  nextMonthStart,
} from "@/lib/plans";

const SYSTEM_PROMPTS: Record<string, string> = {
  standard: `You are a smart college student rewriting your own essay draft. Rewrite the following text so it sounds like a real, intelligent student wrote it — clear and competent, but not robotic or overly polished. Rules:

- Keep the tone thoughtful and articulate, like someone who knows the material but isn't trying too hard.
- Vary sentence length naturally. Mix shorter direct sentences with longer ones that develop an idea.
- Use "I" occasionally if appropriate, or hedge with "it seems", "this suggests", "one could argue".
- NO em dashes (—). Use commas or periods instead.
- NO these words: utilize, facilitate, leverage, moreover, furthermore, nevertheless, endeavor, commence, delve, underscore, multifaceted, nuanced, pivotal, realm, robust, transformative, streamline, cutting-edge, it is important to note, it is worth noting, in today's world.
- Avoid starting consecutive sentences with the same word.
- Do not write a conclusion sentence. End on a thought, not a summary.
- Return ONLY the rewritten text.`,

  aggressive: `You are a college student rewriting an essay to sound completely human. Be direct and clear, not casual or slangy. Rules:

1. Maximum sentence length: 20 words. Split longer sentences.
2. Start some sentences with "This", "That", "It", "When", "What", "Here".
3. Use hedging: "seems to", "appears to", "might be", "could suggest".
4. NO em dashes (—). Use commas or periods only.
5. No formal transitions like "however", "therefore", "consequently", "in contrast".
6. End with an open observation, not a conclusion.
7. BANNED: utilize, facilitate, leverage, moreover, furthermore, endeavor, robust, pivotal, delve, nuanced, multifaceted, transformative, in conclusion, to summarize, it is important to note.
Return ONLY the rewritten text.`,

  academic: `Rewrite this as a real university student — intelligent but not a professional writer. Rules:

- Use hedging language: "seems to", "appears to", "could be argued", "this suggests".
- Mostly formal but let one slightly imperfect phrase slip through.
- Avoid perfect parallel structure — real students don't always write "First... Second... Third..."
- One sentence can be slightly clunky — a student reaching for a complex idea.
- NO em dashes (—). Use commas or periods.
- End on analysis, not summary. No conclusion sentence.
- BANNED: utilize, facilitate, leverage, moreover, furthermore, endeavor, delve, multifaceted, pivotal, robust, nuanced, realm, underscore, transformative, in conclusion, to summarize, in today's world.
- Return ONLY the rewritten text.`,
};

const SENTENCE_REWRITE_PROMPT = `You will receive a single sentence. Rewrite it so it sounds like a smart college student wrote it naturally. Rules:
- Keep the same meaning.
- Change the word order or structure if possible.
- Replace any generic or predictable word with a more specific, natural alternative.
- NO em dashes (—). Use commas or periods instead.
- Do not add new information.
- Return ONLY the rewritten sentence, nothing else.`;

const FINAL_PASS_PROMPT = `You are an editor checking a student essay for AI writing patterns. Make ONLY these fixes:

1. Find any two consecutive sentences that start with the same word — fix one of them.
2. Find the single most "AI-sounding" sentence — too smooth, too perfectly balanced — and rewrite it to sound more natural.
3. Remove any em dashes (—) and replace with a comma or period.
4. Remove these phrases: "it is important to note", "it is worth noting", "in today's world", "in conclusion", "to summarize", "to sum up", "this demonstrates that", "this shows that", "overall,".
5. If the last sentence sounds like a conclusion or moral lesson — delete it.
Return ONLY the corrected text.`;

function buildSystemPrompt(basePrompt: string, writingSample: string | null): string {
  if (!writingSample) return basePrompt;
  return (
    `IMPORTANT: First analyze this writing sample — note the vocabulary level, sentence length, tone, and any patterns:\n\n"${writingSample}"\n\nNow rewrite the following text to match that exact style.\n\n` +
    basePrompt
  );
}

function splitIntoSentences(text: string): string[] {
  return text
    .replace(/([.!?])\s+/g, "$1\n")
    .split("\n")
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function postProcess(text: string): string {
  let out = text;

  const replacements: Array<[RegExp, string]> = [
    [/\butilized?\b/gi, "used"],
    [/\butilization\b/gi, "use"],
    [/\bfacilitates?\b/gi, "helps"],
    [/\bfacilitated\b/gi, "helped"],
    [/\bleveraged?\b/gi, "used"],
    [/\bleverages\b/gi, "uses"],
    [/\bmoreover\b/gi, "also"],
    [/\bfurthermore\b/gi, "and"],
    [/\bnevertheless\b/gi, "still"],
    [/\bendeavors?\b/gi, "tries"],
    [/\bcommences?\b/gi, "starts"],
    [/\bcommenced\b/gi, "started"],
    [/\bdelves?\b/gi, "gets into"],
    [/\bunderscores?\b/gi, "shows"],
    [/\bpivotal\b/gi, "key"],
    [/\brobust\b/gi, "solid"],
    [/\bmultifaceted\b/gi, "complex"],
    [/\btransformative\b/gi, "significant"],
    [/\bin today's (world|society)\b/gi, "these days"],
    [/\bit is important to note( that)?\b/gi, ""],
    [/\bit is worth noting( that)?\b/gi, ""],
    [/\bin conclusion[,.]?\s*/gi, ""],
    [/\bto summarize[,.]?\s*/gi, ""],
    [/\bin summary[,.]?\s*/gi, ""],
    [/\bto sum up[,.]?\s*/gi, ""],
    [/\boverall,\s*/gi, ""],
    [/ — /g, ", "],
    [/—/g, ","],
  ];

  for (const [pattern, replacement] of replacements) {
    out = out.replace(pattern, (match) => {
      if (replacement.length > 0) {
        return /^[A-Z]/.test(match)
          ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
          : replacement;
      }
      return replacement;
    });
  }

  out = out.replace(
    /[^.!?]*\b(in conclusion|to summarize|in summary|overall,?\s+this|this (essay|paper|text) (has|shows|demonstrates|highlights))\b[^.!?]*[.!?]\s*/gi,
    ""
  );

  out = out.replace(/\s{2,}/g, " ").trim();
  return out;
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
  // Pass 1: Full rewrite in target mode (gpt-4o)
  const pass1 = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: buildSystemPrompt(SYSTEM_PROMPTS[mode], styleText) },
      { role: "user", content: text.trim() },
    ],
    temperature,
    frequency_penalty: 0.5,
    presence_penalty: 0.3,
  });
  const pass1Text = pass1.choices[0]?.message?.content ?? text;

  // Pass 2: Sentence-by-sentence rewrite with gpt-4o-mini
  // This breaks the GPT-4o token fingerprint by processing each sentence independently
  const sentences = splitIntoSentences(pass1Text);
  const rewrittenSentences = await Promise.all(
    sentences.map(async (sentence) => {
      if (sentence.split(" ").length < 4) return sentence; // skip very short sentences
      try {
        const res = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: SENTENCE_REWRITE_PROMPT },
            { role: "user", content: sentence },
          ],
          temperature: 0.9,
          frequency_penalty: 0.8,
          max_tokens: 150,
        });
        return res.choices[0]?.message?.content?.trim() ?? sentence;
      } catch {
        return sentence;
      }
    })
  );
  const pass2Text = rewrittenSentences.join(" ");

  // Pass 3: Final cleanup (gpt-4o)
  const pass3 = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: FINAL_PASS_PROMPT },
      { role: "user", content: pass2Text },
    ],
    temperature: 0.4,
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
  const styleText =
    typeof writingSample === "string" && writingSample.trim()
      ? writingSample.trim()
      : null;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in to use HumanizeIt." }, { status: 401 });
  }

  const safeMode =
    typeof mode === "string" && mode in SYSTEM_PROMPTS ? mode : "standard";
  const temperature =
    safeMode === "aggressive" ? 0.85 : safeMode === "academic" ? 0.6 : 0.75;

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

  let { data: usage } = await supabase.from("usage").select("*").eq("user_id", user.id).single();

  if (!usage) {
    const { data: created } = await supabase
      .from("usage")
      .upsert(
        { user_id: user.id, plan: "free", words_used: 0, words_reset_at: nextMonthStart() },
        { onConflict: "user_id" }
      )
      .select()
      .single();
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