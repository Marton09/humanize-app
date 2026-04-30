"use client";

import { useState, useEffect } from "react";
import { Sora } from "next/font/google";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  trial: "Trial",
  pro: "Pro",
  unlimited: "Unlimited",
};

const PLAN_COLORS: Record<string, string> = {
  free: "text-white/50",
  trial: "text-orange-400",
  pro: "text-orange-400",
  unlimited: "text-amber-400",
};

export default function AccountPage() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [usage, setUsage] = useState<{ plan: string; wordsUsed: number; wordLimit: number | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser({ email: user.email ?? "" });

      const res = await fetch("/api/usage");
      const data = await res.json();
      if (data.plan) setUsage({ plan: data.plan, wordsUsed: data.wordsUsed, wordLimit: data.wordLimit });
      setLoading(false);
    }
    load();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const usagePct = usage && usage.wordLimit != null && usage.wordLimit > 0
    ? Math.min(100, (usage.wordsUsed / usage.wordLimit) * 100)
    : null;

  const usageBarColor = usagePct !== null
    ? usagePct >= 90 ? "bg-red-500" : usagePct >= 70 ? "bg-amber-500" : "bg-orange-500"
    : "bg-orange-500";

  return (
    <div className={`${sora.variable} font-[family-name:var(--font-sora)] min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-4`}>

      <div aria-hidden className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-orange-500/[0.07] blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-[460px]">

        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-9 group">
          <div className="relative">
            <div className="absolute inset-0 bg-orange-500 rounded-xl blur-[10px] opacity-50 group-hover:opacity-70 transition-opacity" />
            <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-900/30">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L8.6 5.6H13.8L9.6 8.5L11.2 13.4L7 10.5L2.8 13.4L4.4 8.5L0.2 5.6H5.4L7 1Z" fill="white"/>
              </svg>
            </div>
          </div>
          <span className="text-[16px] font-bold tracking-tight text-white/90 group-hover:text-white transition-colors">
            HumanizeIt
          </span>
        </Link>

        <div className="bg-[#111111] border border-white/[0.07] rounded-3xl p-8 flex flex-col gap-6">
          <h1 className="text-[1.6rem] font-black tracking-tight text-white">My Account</h1>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 rounded-full border-2 border-orange-500/20 border-t-orange-400 animate-spin" />
            </div>
          ) : (
            <>
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">Email</span>
                <span className="text-[14.5px] text-white/75">{user?.email}</span>
              </div>

              <div className="h-px bg-white/[0.07]" />

              {/* Plan */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">Current Plan</span>
                <div className="flex items-center justify-between">
                  <span className={`text-xl font-black ${PLAN_COLORS[usage?.plan ?? "free"]}`}>
                    {PLAN_LABELS[usage?.plan ?? "free"]} Plan
                  </span>
                  {usage?.plan !== "unlimited" && (
                    <Link
                      href="/app"
                      onClick={() => setTimeout(() => document.querySelector<HTMLButtonElement>("[data-upgrade]")?.click(), 500)}
                      className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      Upgrade ↗
                    </Link>
                  )}
                </div>

                {/* Usage bar */}
                {usage && usage.wordLimit != null && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-white/30">
                        {usage.wordsUsed.toLocaleString()} / {usage.wordLimit.toLocaleString()} words used
                      </span>
                      <span className="text-[12px] text-white/30">{usagePct?.toFixed(0)}%</span>
                    </div>
                    <div className="h-[4px] w-full rounded-full overflow-hidden bg-white/[0.07]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${usageBarColor}`}
                        style={{ width: `${usagePct}%` }}
                      />
                    </div>
                  </div>
                )}

                {usage?.plan === "unlimited" && (
                  <span className="text-[12px] text-white/30">{usage.wordsUsed.toLocaleString()} words used · Unlimited</span>
                )}
              </div>

              <div className="h-px bg-white/[0.07]" />

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <Link
                  href="/app"
                  className="w-full flex items-center justify-center py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-900/30 hover:from-orange-400 hover:to-amber-400 transition-all duration-200"
                >
                  Go to Humanizer
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center py-3 rounded-xl text-sm font-bold border-2 border-white/[0.08] text-white/40 hover:border-red-500/30 hover:text-red-400 transition-all duration-200"
                >
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}