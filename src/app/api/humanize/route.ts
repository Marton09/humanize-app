import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import {
  PLAN_WORD_LIMITS,
  getEffectivePlan,
  nextMonthStart,
} from "@/lib/plans";

const SYSTEM_PROMPTS: Record<string, string> = {
  standard: `You are rewriting a text to sound like it was written by a real college student. Follow every rule strictly:

SENTENCE STRUCTURE (most important):
- Every paragraph MUST contain at least one sentence under 7 words AND one sentence over 25 words.
- Never write three sentences in a row with similar lengths. Alternate between short, medium, and long.
- Start sentences with different words every time. Never repeat a sentence opener.

VOCABULARY:
- Replace generic verbs (use, show, help, make, get) with more specific alternatives.
- Use active voice exclusively.
- Use hedging naturally: "this seems to", "one could argue", "it appears that".

TONE:
- Sound like a smart but imperfect student. Not a professional. Not a robot.
- Include one slightly awkward phrase — the kind a student writes when reaching for a big idea.
- Do NOT summarize or conclude. End mid-analysis.

BANNED: Em dashes (—), moreover, furthermore, nevertheless, utilize, facilitate, leverage, endeavor, commence, delve, underscore, pivotal, robust, multifaceted, nuanced, transformative, in conclusion, to summarize, it is important to note, in today's world

Return ONLY the rewritten text.`,

  aggressive: `You are rewriting text to be completely undetectable by AI detectors. Every rule is mandatory:

SENTENCE STRUCTURE:
- Hard cap: no sentence longer than 15 words.
- Every paragraph needs one sentence of 3-5 words. Just like that.
- Vary rhythm: 3 short → 1 long → 2 short → 1 medium. Never uniform.

VOCABULARY AND VOICE:
- Use first person occasionally: "I think", "to me", "in my view".
- Include one self-correction: "or maybe", "well, sort of", "I mean".
- Use one parenthetical aside (thrown in naturally like this).
- Start 2+ sentences with: And, But, So, Because, Look.

BANNED: Em dashes (—), however, therefore, consequently, moreover, furthermore, utilize, facilitate, leverage, robust, pivotal, delve, nuanced, multifaceted, in conclusion, to summarize

Return ONLY the rewritten text.`,

  academic: `You are rewriting text as a real university student — smart but imperfect. Rules:

STRUCTURE:
- Mix sentence lengths. One sentence per paragraph must be under 8 words. One must be over 20.
- Break parallel structure at least once.
- Use "this" and "these" as openers instead of always repeating the noun.

ACADEMIC VOICE:
- Hedging: "seems to suggest", "appears to indicate", "could be interpreted as", "one might argue".
- Mostly formal but let one slightly casual phrase slip through.
- One sentence should be slightly clunky.
- End on analysis, not summary.

BANNED: Em dashes (—), moreover, furthermore, utilize, facilitate, leverage, endeavor, delve, multifaceted, pivotal, robust, nuanced, realm, underscore, transformative, in conclusion, to summarize, in today's world

Return ONLY the rewritten text.`,
};

const INTERNAL_DETECTOR_PROMPT = `You are an AI detection system. Analyze the following text and score it from 0-100 on how likely it is to be AI-generated, where 0 = definitely human and 100 = definitely AI.

Look for these AI signals:
- Uniform sentence lengths
- Formal transitional phrases (moreover, furthermore, however, therefore)
- Perfect parallel structure
- Overly smooth, balanced phrasing
- No personal voice or hedging
- Conclusion/summary sentences
- Em dashes used frequently
- Banned AI words: utilize, facilitate, leverage, pivotal, robust, multifaceted, nuanced, delve

Respond with ONLY a JSON object: {"score": <number>, "reasons": ["reason1", "reason2"]}`;

const VARIABILITY_BOOST_PROMPT = `The following text was flagged as AI-generated. Fix it:

1. Find the 3 longest sentences and break each into two shorter ones.
2. Find any 3 sentences in a row with similar length — make the middle one under 8 words.
3. Replace 5 generic words with more specific unexpected alternatives.
4. Add one personal hedge ("it seems", "one might argue", "this suggests").
5. If the last sentence sounds like a conclusion — delete it.
6. Remove ALL em dashes (—) and replace with commas or periods.

Return ONLY the improved text.`;

function buildSystemPrompt(basePrompt: string, writingSample: string | null): string {
  if (!writingSample) return basePrompt;
  return (
    `CRITICAL: Analyze this writing sample. Study vocabulary, sentence length, tone, quirks:\n\n"${writingSample}"\n\nRewrite the following text to match that exact style.\n\n` +
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

function forceBurstiness(text: string): string {
  let out = text;

  // Remove em dashes
  out = out.replace(/ — /g, ", ").replace(/—/g, ",");

  // Hard-replace banned AI words
  const replacements: Array<[RegExp, string]> = [
    [/\butilized?\b/gi, "used"],
    [/\bfacilitates?\b/gi, "helps"],
    [/\bfacilitated\b/gi, "helped"],
    [/\bleveraged?\b/gi, "used"],
    [/\bmoreover\b/gi, "also"],
    [/\bfurthermore\b/gi, "and"],
    [/\bnevertheless\b/gi, "still"],
    [/\bendeavors?\b/gi, "tries"],
    [/\bcommences?\b/gi, "starts"],
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
    [/\boverall,\s*/gi, ""],
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

  // Force burstiness: split sentences that are too uniform
  const sentences = splitIntoSentences(out);
  const result: string[] = [];

  for (let i = 0; i < sentences.length; i++) {
    const curr = sentences[i];
    const prev = sentences[i - 1];
    const next = sentences[i + 1];

    if (prev && next) {
      const currLen = curr.split(" ").length;
      const prevLen = prev.split(" ").length;
      const nextLen = next.split(" ").length;

      if (
        Math.abs(currLen - prevLen) < 5 &&
        Math.abs(currLen - nextLen) < 5 &&
        currLen > 10
      ) {
        const splitMatch = curr.match(/^(.{20,}?),\s(.+)$/);
        if (splitMatch) {
          result.push(splitMatch[1] + ".");
          result.push(splitMatch[2].charAt(0).toUpperCase() + splitMatch[2].slice(1));
          continue;
        }
      }
    }
    result.push(curr);
  }

  out = result.join(" ");
  out = out.replace(/\s{2,}/g, " ").trim();
  return out;
}

async function scoreWithInternalDetector(
  openai: OpenAI,
  text: string
): Promise<{ score: number; reasons: string[] }> {
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: INTERNAL_DETECTOR_PROMPT },
        { role: "user", content: text },
      ],
      temperature: 0.1,
      max_tokens: 200,
    });
    const content = res.choices[0]?.message?.content ?? '{"score": 50, "reasons": []}';
    const clean = content.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return { score: 50, reasons: [] };
  }
}

async function runHumanizePipeline(
  openai: OpenAI,
  anthropic: Anthropic,
  gemini: GoogleGenerativeAI,
  text: string,
  mode: string,
  styleText: string | null,
  temperature: number
): Promise<string> {

  // ── Pass 1: GPT-4o full rewrite ──────────────────────────────────
  const pass1 = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: buildSystemPrompt(SYSTEM_PROMPTS[mode], styleText) },
      { role: "user", content: text.trim() },
    ],
    temperature,
    frequency_penalty: 0.8,
    presence_penalty: 0.6,
  });
  const pass1Text = pass1.choices[0]?.message?.content ?? text;

  // ── Pass 2: Rotate sentences across Claude + Gemini ──────────────
  // Odd sentences → Claude, Even sentences → Gemini
  // This creates mixed token fingerprints that detectors can't identify
  const sentences = splitIntoSentences(pass1Text);
  const geminiModel = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });

  const claudePrompt = `Rewrite this sentence to sound more natural and human. Change the word order, replace the most predictable word with something more specific. NO em dashes. Return ONLY the rewritten sentence.`;
  const geminiPrompt = `Rewrite this single sentence from a student essay. Make it sound more natural by changing phrasing and replacing generic words. No em dashes. Return ONLY the rewritten sentence, nothing else.`;

  const rewrittenSentences = await Promise.all(
    sentences.map(async (sentence, i) => {
      if (sentence.split(" ").length < 4) return sentence;

      if (i % 2 === 0) {
        // Even sentences → Claude
        try {
          const res = await anthropic.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 200,
            system: claudePrompt,
            messages: [{ role: "user", content: sentence }],
          });
          const content = res.content[0];
          return content.type === "text" ? content.text.trim() : sentence;
        } catch {
          return sentence;
        }
      } else {
        // Odd sentences → Gemini
        try {
          const result = await geminiModel.generateContent(
            `${geminiPrompt}\n\nSentence: ${sentence}`
          );
          return result.response.text().trim() || sentence;
        } catch {
          return sentence;
        }
      }
    })
  );
  const pass2Text = rewrittenSentences.join(" ");

  // ── Pass 3: Algorithmic burstiness forcing ───────────────────────
  let current = forceBurstiness(pass2Text);

  // ── Pass 4: Adversarial verification loop ───────────────────────
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    const { score, reasons } = await scoreWithInternalDetector(openai, current);
    if (score < 40) break;

    const boostRes = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: VARIABILITY_BOOST_PROMPT + (reasons.length > 0
            ? `\n\nSpecific issues:\n${reasons.map(r => `- ${r}`).join("\n")}`
            : ""),
        },
        { role: "user", content: current },
      ],
      temperature: 0.9,
      frequency_penalty: 0.9,
      presence_penalty: 0.7,
    });

    current = forceBurstiness(boostRes.choices[0]?.message?.content ?? current);
    attempts++;
  }

  return current;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not set." }, { status: 500 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set." }, { status: 500 });
  }
  if (!process.env.GOOGLE_API_KEY) {
    return NextResponse.json({ error: "GOOGLE_API_KEY is not set." }, { status: 500 });
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
    safeMode === "aggressive" ? 0.95 : safeMode === "academic" ? 0.65 : 0.85;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

  const ADMIN_EMAILS = ["martongalicza@gmail.com"];
  if (ADMIN_EMAILS.includes(user.email ?? "")) {
    try {
      const result = await runHumanizePipeline(openai, anthropic, gemini, text as string, safeMode, styleText, temperature);
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
    const result = await runHumanizePipeline(openai, anthropic, gemini, text as string, safeMode, styleText, temperature);
    const newTotal = currentUsed + inputWords;
    await supabase.from("usage").update({ words_used: newTotal }).eq("user_id", user.id);
    return NextResponse.json({ result, wordsUsed: newTotal, wordLimit, plan });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}