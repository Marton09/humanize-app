"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const PRICE_IDS: Record<string, string> = {
  trial:     process.env.NEXT_PUBLIC_STRIPE_TRIAL_PRICE_ID     ?? "",
  pro:       process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID       ?? "",
  unlimited: process.env.NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID ?? "",
};

function UpgradeInner() {
  const params = useSearchParams();
  const plan   = params.get("plan") ?? "pro";

  useEffect(() => {
    const priceId = PRICE_IDS[plan];
    if (!priceId) return;

    fetch("/api/stripe/checkout", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ priceId, plan }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.url) window.location.href = data.url;
      })
      .catch(console.error);
  }, [plan]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-[2.5px] border-orange-500/20 border-t-orange-400 animate-spin mx-auto" />
        <p className="text-white/60 text-sm">Redirecting to checkout…</p>
      </div>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <Suspense>
      <UpgradeInner />
    </Suspense>
  );
}