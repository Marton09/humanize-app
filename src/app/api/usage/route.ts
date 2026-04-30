import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  PLAN_WORD_LIMITS,
  getEffectivePlan,
  nextMonthStart,
} from "@/lib/plans";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let { data: usage } = await supabase
    .from("usage")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Create default record if this is the user's first visit
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
    return NextResponse.json({ error: "Could not load usage" }, { status: 500 });
  }

  const plan = getEffectivePlan(usage.plan, usage.trial_start_date);

  // Auto-expire trial in DB
  if (plan !== usage.plan) {
    await supabase
      .from("usage")
      .update({ plan: "free" })
      .eq("user_id", user.id);
  }

  // Monthly reset for free / pro
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

  const wordLimit = PLAN_WORD_LIMITS[plan];

  return NextResponse.json({
    plan,
    wordsUsed: usage.words_used ?? 0,
    wordLimit,
    trialStartDate: usage.trial_start_date ?? null,
  });
}
