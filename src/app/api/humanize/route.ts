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

const DETECTOR_BYPASS_PROMPT =
  "The following text was written by AI trying to sound human. Your job is to make it truly undetectable. Make these specific changes: 1) Randomly remove Oxford commas. 2) Add 1-2 minor grammatical quirks real people make like starting a sentence with Because or And. 3) Replace some adjectives with more specific unusual word choices a real person might use. 4) Add one very specific concrete detail that feels personal. 5) Make one sentence noticeably shorter than the rest — like a single punchy thought. 6) Remove any sentence that sounds like a conclusion or summary. 7) Change the rhythm of the last paragraph to feel abrupt or unfinished. Return only the final text, no commentary.";

function buildSystemPrompt(basePrompt: string, writingSample: string | null): string {
  if (!writingSample) return basePrompt;
  return (
    `First carefully analyze this writing sample to understand the person's unique style — their vocabulary level, average sentence length, tone (formal/casual), common phrases they use, punctuation habits, and any quirks:\n\n"${writingSample}"\n\nNow rewrite the following AI text to match that exact personal writing style as closely as possible. It should sound like the same person who wrote the sample wrote this too.\n\n` +
    basePrompt
  );
}

function postProcess(text: string): string {
  let out = text;

  // ── 1. Synonym swapping ───────────────────────────────────────────
  const synonyms: [RegExp, string, string][] = [
    [/\butilize\b/g,       "use",    "Use"],
    [/\butilization\b/g,   "use",    "Use"],
    [/\bdemonstrate\b/g,   "show",   "Show"],
    [/\bdemonstrates\b/g,  "shows",  "Shows"],
    [/\bdemonstrated\b/g,  "showed", "Showed"],
    [/\bfacilitate\b/g,    "help",   "Help"],
    [/\bfacilitates\b/g,   "helps",  "Helps"],
    [/\bleverage\b/g,      "use",    "Use"],
    [/\bleverages\b/g,     "uses",   "Uses"],
    [/\bleveraged\b/g,     "used",   "Used"],
    [/\bendeavor\b/g,      "try",    "Try"],
    [/\bcommence\b/g,      "start",  "Start"],
    [/\bcommences\b/g,     "starts", "Starts"],
    [/\bobtain\b/g,        "get",    "Get"],
    [/\bobtains\b/g,       "gets",   "Gets"],
    [/\bobtained\b/g,      "got",    "Got"],
    [/\badditional\b/g,    "more",   "More"],
    [/\bnumerous\b/g,      "many",   "Many"],
    [/\bsignificant\b/g,   "big",    "Big"],
    [/\bsignificantly\b/g, "a lot",  "A lot"],
    [/\bsubsequently\b/g,  "then",   "Then"],
    [/\btherefore\b/g,     "so",     "So"],
    [/\bhowever\b/g,       "but",    "But"],
    [/\bnevertheless\b/g,  "still",  "Still"],
    [/\bfurthermore\b/g,   "also",   "Also"],
    [/\bmoreover\b/g,      "also",   "Also"],
    [/\bin addition\b/gi,  "plus",   "Plus"],
  ];
  for (const [pattern, lower, upper] of synonyms) {
    out = out.replace(pattern, (match) => (/^[A-Z]/.test(match) ? upper : lower));
  }

  // ── 2. Remove conclusion sentences ───────────────────────────────
  out = out.replace(/[^.!?]*\b(in conclusion|in summary|to summarize|in essence|ultimately this shows)\b[^.!?]*[.!?]/gi, "");
  out = out.replace(/[^.!?]*\boverall[,\s][^.!?]*[.!?]/gi, "");

  // ── 3. Contraction randomization ─────────────────────────────────
  // Randomly expand contractions for inconsistency
  const expand: [RegExp, string][] = [
    [/\bdon't\b/g,     "do not"],
    [/\bwon't\b/g,     "will not"],
    [/\bcan't\b/g,     "cannot"],
    [/\bwouldn't\b/g,  "would not"],
    [/\bshouldn't\b/g, "should not"],
    [/\bcouldn't\b/g,  "could not"],
    [/\bisn't\b/g,     "is not"],
    [/\baren't\b/g,    "are not"],
    [/\bwasn't\b/g,    "was not"],
    [/\bweren't\b/g,   "were not"],
  ];
  for (const [pat, exp] of expand) {
    out = out.replace(pat, (m) => {
      if (Math.random() >= 0.35) return m;
      return /^[A-Z]/.test(m) ? exp.charAt(0).toUpperCase() + exp.slice(1) : exp;
    });
  }
  // Randomly collapse expansions
  const collapse: [RegExp, string][] = [
    [/\bdo not\b/gi,   "don't"],
    [/\bit is\b/gi,    "it's"],
    [/\bthey are\b/gi, "they're"],
    [/\bwe are\b/gi,   "we're"],
    [/\byou are\b/gi,  "you're"],
    [/\bI am\b/g,      "I'm"],
    [/\bwill not\b/gi, "won't"],
    [/\bcannot\b/gi,   "can't"],
  ];
  for (const [pat, con] of collapse) {
    out = out.replace(pat, (m) => {
      if (Math.random() >= 0.4) return m;
      return /^[A-Z]/.test(m) ? con.charAt(0).toUpperCase() + con.slice(1) : con;
    });
  }

  // ── 4. Sentence splitting (30% of sentences > 20 words) ──────────
  const sentences = out.match(/[^.!?]+[.!?]+(?:\s+|$)/g) ?? [out];
  const split = sentences.map((s) => {
    const wordCount = s.trim().split(/\s+/).length;
    if (wordCount <= 20 || Math.random() > 0.3) return s;
    const lo = Math.floor(s.length * 0.35);
    const hi = Math.floor(s.length * 0.70);
    const mid = s.slice(lo, hi);
    const conjMatch = mid.match(/,\s*(and|but|so|which|because|although|while)\b/i);
    if (conjMatch?.index !== undefined) {
      const at = lo + conjMatch.index;
      const first = s.slice(0, at).trimEnd().replace(/,$/, "") + ".";
      const rest = s.slice(at).replace(/^,\s*/, "").trim();
      return `${first} ${rest.charAt(0).toUpperCase() + rest.slice(1)}`;
    }
    const commaMatch = mid.match(/,/);
    if (commaMatch?.index !== undefined) {
      const at = lo + commaMatch.index;
      const first = s.slice(0, at).trimEnd() + ".";
      const rest = s.slice(at + 1).trim();
      return `${first} ${rest.charAt(0).toUpperCase() + rest.slice(1)}`;
    }
    return s;
  });
  out = split.join("");

  // ── 5. Em dash insertion (replace comma with — in 2-3 spots) ─────
  let emCount = 0;
  out = out.replace(/([^.!?\n]),\s(?=[a-z])/g, (match, before) => {
    if (emCount < 3 && Math.random() < 0.25) { emCount++; return `${before} — `; }
    return match;
  });

  // ── 6. Parenthetical wrapping (1-2 short mid-sentence clauses) ───
  let parenCount = 0;
  out = out.replace(/,\s([a-z][^,]{6,28}),/g, (match, clause) => {
    if (parenCount < 2 && Math.random() < 0.2) { parenCount++; return ` (${clause.trim()}),`; }
    return match;
  });

  // ── 7. Filler phrase injection between sentences ──────────────────
  const fillers = [
    "Honestly, ",
    "To be fair, ",
    "And that's kind of the point — ",
    "Which is wild, because ",
    "If that makes sense, ",
    "The thing is, ",
  ];
  let fillerCount = 0;
  out = out.replace(/\.\s+([A-Z])/g, (match, nextChar) => {
    if (fillerCount < 2 && Math.random() < 0.12) {
      fillerCount++;
      const filler = fillers[Math.floor(Math.random() * fillers.length)];
      return `. ${filler}${nextChar.toLowerCase()}`;
    }
    return match;
  });

  // ── 8. Randomize paragraph openers (replace excess "The " starts) ─
  const paras = out.split(/\n\n+/);
  const theCount = paras.filter((p) => /^\s*The\s/.test(p)).length;
  if (theCount > 2) {
    let changed = 0;
    out = paras.map((p) => {
      if (changed < theCount - 2 && /^\s*The\s/.test(p) && Math.random() > 0.45) {
        changed++;
        return p.replace(/^(\s*)The\s/, "$1This ");
      }
      return p;
    }).join("\n\n");
  }

  return out.replace(/  +/g, " ").trim();
}

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
      const pass1 = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: buildSystemPrompt(SYSTEM_PROMPTS[safeMode], styleText) },
          { role: "user", content: text.trim() },
        ],
        temperature,
      });
      const pass1Text = pass1.choices[0]?.message?.content ?? "";
      const pass2 = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: DETECTOR_BYPASS_PROMPT },
          { role: "user", content: pass1Text },
        ],
        temperature: 0.7,
      });
      return NextResponse.json({
        result: postProcess(pass2.choices[0]?.message?.content ?? pass1Text),
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

    const pass1 = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: buildSystemPrompt(SYSTEM_PROMPTS[safeMode], styleText) },
        { role: "user", content: text.trim() },
      ],
      temperature,
    });
    const pass1Text = pass1.choices[0]?.message?.content ?? "";

    const pass2 = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: DETECTOR_BYPASS_PROMPT },
        { role: "user", content: pass1Text },
      ],
      temperature: 0.7,
    });

    const result = postProcess(pass2.choices[0]?.message?.content ?? pass1Text);

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
