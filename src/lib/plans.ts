export type Plan = "free" | "trial" | "pro" | "unlimited";

export const PLAN_WORD_LIMITS: Record<Plan, number> = {
  free:      250,
  trial:     500,
  pro:       50_000,
  unlimited: Infinity,
};

export const PLAN_LABELS: Record<Plan, string> = {
  free:      "Free",
  trial:     "Trial",
  pro:       "Pro",
  unlimited: "Unlimited",
};

export function getEffectivePlan(
  plan: string,
  trialStartDate: string | null
): Plan {
  if (plan === "trial" && trialStartDate) {
    const ageMs = Date.now() - new Date(trialStartDate).getTime();
    if (ageMs > 7 * 24 * 60 * 60 * 1000) return "free"; // expired
  }
  return (plan as Plan) in PLAN_WORD_LIMITS ? (plan as Plan) : "free";
}

export function nextMonthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
}
