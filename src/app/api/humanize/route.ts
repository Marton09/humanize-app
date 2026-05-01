import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import {
  PLAN_WORD_LIMITS,
  getEffectivePlan,
  nextMonthStart,
} from "@/lib/plans";

const SYSTEM_PROMPTS: Record<string, string> = {
  standard: `You are a human rewriting your own notes. Rewrite the text below so it sounds like a real person typed it out — not perfectly, but naturally. Follow these rules without exception:

- Mix sentence lengths DRAMATICALLY. Some sentences: 3 words. Others wind around for a while, picking up details and asides before they land somewhere, which is what real writers do when they're not thinking too hard about it.
- Do NOT start sentences with "The" or "This" more than once. Use "It", "That", "So", "There", "When", "What", "Look", "Honestly", "Kind of".
- Use contractions (it's, don't, they're, you'd) but skip them in roughly every third sentence.
- BANNED WORDS — never use: utilize, facilitate, leverage, moreover, furthermore, nevertheless, endeavor, commence, delve, underscore, multifaceted, nuanced, pivotal, realm, robust, transformative, streamline, cutting-edge, ever-evolving, in today's world, it is important to note, it is worth noting.
- At least two sentences must be under 6 words. Short. Like that.
- Include one concrete specific detail that only a human would think to add.
- One sentence should be slightly grammatically loose — trailing off, or starting with And or But.
- NO conclusion sentence. Stop mid-thought if needed.
- Return ONLY the rewritten text.`,

  aggressive: `You are rewriting AI text to fool GPTZero 4.4b and Turnitin. Every rule below is mandatory:

1. Sentence length cap: 10 words max. Split anything longer into two.
2. Vocabulary: kinda, pretty much, a lot, stuff, things, way more, not really, sort of, I guess.
3. Voice: "I think", "honestly", "to me", "the way I see it", "I mean".
4. Start 3+ sentences with: And, But, So, Because, Look, Which, That's.
5. One parenthetical aside (like this one — thrown in casually).
6. One self-correction: "well, sort of", "or maybe not", "I mean, kind of".
7. Rhythm: three short punchy sentences in a row, then one longer rambling one.
8. Zero formal transitions. No "however", "therefore", "consequently", "in contrast", "additionally".
9. End on something unresolved — a question, or a thought that just stops.
10. BANNED: utilize, facilitate, leverage, moreover, furthermore, endeavor, robust, pivotal, realm, delve, nuanced, multifaceted, transformative, in conclusion, to summarize.
Return ONLY the rewritten text.`,

  academic: `Rewrite this as a real university student — intelligent but imperfect. Rules:

- Hedging: "seems to", "appears to", "could be argued", "this suggests", "it's worth considering".
- Mostly formal but let one or two slightly casual phrases slip through naturally.
- Break parallel structure at least once — real students don't always write "First... Second... Third..."
- One sentence should be slightly clunky — a student reaching for a big idea.
- Use "this" and "these" as openers sometimes instead of restating the noun.
- End on analysis, not summary. No conclusion sentence.
- BANNED: utilize, facilitate, leverage, moreover, furthermore, endeavor, delve, multifaceted, pivotal, robust, nuanced, realm, underscore, transformative, in conclusion, to summarize, in today's world.
- Return ONLY the rewritten text.`,
};

const SCRAMBLE_PROMPT = `You will receive a paragraph or short text. Rewrite it sentence by sentence so each feels written independently. Rules:

1. For every sentence: change the word order if possible while keeping the meaning.
2. Replace the most predictable word in each sentence with something more specific or unexpected.
3. Vary the sentence opening for every single sentence — no two sentences can start with the same word.
4. For 2-3 sentences, deliberately break the rhythm — make one much shorter, start one with "And" or "But".
5. Remove any sentence that feels like a summary or conclusion.
6. Do NOT add new content or change the meaning — only restructure and re-word.
Return ONLY the rewritten text.`;

const PERPLEXITY_PROMPT = `Increase the linguistic unpredictability of this text so it passes GPTZero. The detector measures how surprising each word choice is — make the text less predictable at the word level:

1. Find 5-8 generic words (good, important, help, show, make, use, get, big, new) and replace each with a more specific, vivid, or unusual word a real person might use.
2. Find the smoothest sentence and roughen it — add an awkward comma, break it in two, or let it trail off.
3. Find consecutive sentences of similar length — change one dramatically.
4. Add one tiny specific detail (a number, a color, a time) that feels like a personal memory.
5. Change any sentence opener that starts with "The".
Return ONLY the modified text.`;

const FINAL_PASS_PROMPT = `Remove AI writing signatures from this text so it passes GPTZero 4.4b. Make ONLY these changes:

1. Find and rewrite the single most AI-sounding sentence — too smooth, too balanced, reads like a textbook.
2. Check: do any two consecutive sentences start with the same word? Fix it.
3. Check the first sentence — if it opens with "The" or "This" or states the topic too directly, rewrite it.
4. Count em dashes (—). If more than 2, remove the extras.
5. Remove these phrases entirely: "it is important to note", "it is worth noting", "in today's world", "in today's society", "in conclusion", "to summarize", "to sum up", "this shows that", "this demonstrates", "this essay", "this paper", "overall,".
6. If the last sentence sounds like a conclusion or moral — delete it.
Return ONLY the final text.`;

function buildSystemPrompt(basePrompt: string, writingSample: string | null): string {
  if (!writingSample) return basePrompt;
  return (
    `CRITICAL: Analyze this writing sample first. Study the vocabulary level, sentence length, tone, punctuation habits, and quirks:\n\n"${writingSample}"\n\nNow rewrite the following text so the SAME person appears to have written it. Match their style precisely.\n\n` +
    basePrompt
  );
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
    [/\btransformative\b/gi, "big"],
    [/\bin today's (world|society)\b/gi, "these days"],
    [/\bit is important to note( that)?\b/gi, ""],
    [/\bit is worth noting( that)?\b/gi, ""],
    [/\bin conclusion[,.]?\s*/gi, ""],
    [/\bto summarize[,.]?\s*/gi, ""],
    [/\bin summary[,.]?\s*/gi, ""],
    [/\bto sum up[,.]?\s*/gi, ""],
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
  // Pass 1: gpt-4o — mode-specific rewrite
  const pass1 = await client.chat.completions.create({
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

  // Pass 2: gpt-4o-mini — sentence-level scrambling (different token distribution)
  const pass2 = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SCRAMBLE_PROMPT },
      { role: "user", content: pass1Text },
    ],
    temperature: 0.95,
    frequency_penalty: 0.9,
    presence_penalty: 0.7,
  });
  const pass2Text = pass2.choices[0]?.message?.content ?? pass1Text;

  // Pass 3: gpt-4o-mini — perplexity injection
  const pass3 = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: PERPLEXITY_PROMPT },
      { role: "user", content: pass2Text },
    ],
    temperature: 0.9,
    frequency_penalty: 0.85,
  });
  const pass3Text = pass3.choices[0]?.message?.content ?? pass2Text;

  // Pass 4: gpt-4o — final AI signature removal
  const pass4 = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: FINAL_PASS_PROMPT },
      { role: "user", content: pass3Text },
    ],
    temperature: 0.6,
  });
  const pass4Text = pass4.choices[0]?.message?.content ?? pass3Text;

  return postProcess(pass4Text);
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
    safeMode === "aggressive" ? 0.95 : safeMode === "academic" ? 0.65 : 0.85;

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