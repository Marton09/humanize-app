{/* ── Disclaimer banner ── */}
<div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-center">
  <p className="text-[12.5px] font-semibold text-amber-400">
    ⚠️ HumanizeIt is currently in progress — the humanizer is not working yet. We&apos;ll be back soon!
  </p>
</div>

"use client";

import { useState, useEffect } from "react";
import { Sora } from "next/font/google";
import Link from "next/link";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });

// ─── Icon primitives ─────────────────────────────────────────────────────────

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1"  x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22"  x2="5.64"  y2="5.64"  /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1"    y1="12"    x2="3"     y2="12"    /><line x1="21"    y1="12"    x2="23"    y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64"  y2="18.36" /><line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"/>
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}
function SlidersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4"  y1="21" x2="4"  y2="14"/><line x1="4"  y1="10" x2="4"  y2="3"/>
      <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8"  x2="12" y2="3"/>
      <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
      <line x1="1"  y1="14" x2="7"  y2="14"/><line x1="9"  y1="8"  x2="15" y2="8"/>
      <line x1="17" y1="16" x2="23" y2="16"/>
    </svg>
  );
}
function ZapIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  );
}
function SparkleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3L14.5 8.5L20 11L14.5 13.5L12 19L9.5 13.5L4 11L9.5 8.5L12 3Z"/>
      <path d="M5 3L6 5L8 6L6 7L5 9L4 7L2 6L4 5L5 3Z" strokeWidth="1.5"/>
      <path d="M19 14L20 16L22 17L20 18L19 20L18 18L16 17L18 16L19 14Z" strokeWidth="1.5"/>
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  );
}
function TikTokIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.81a8.18 8.18 0 004.78 1.52V6.88a4.85 4.85 0 01-1.01-.19z"/>
    </svg>
  );
}
function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? "#f97316" : "none"} stroke="#f97316" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}
function ArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="7" x2="12" y2="7"/><polyline points="8 3 12 7 8 11"/>
    </svg>
  );
}

// ─── Static data ─────────────────────────────────────────────────────────────

const FEATURES = [
  { Icon: ShieldIcon,  title: "Bypasses AI Detectors",        desc: "Clears GPTZero, Turnitin, Originality.AI, and more — every time, without fail." },
  { Icon: SlidersIcon, title: "Multiple Writing Modes",        desc: "Standard, Aggressive, and Academic — tailored to match your exact tone and context." },
  { Icon: ZapIcon,     title: "Lightning Fast",                desc: "Results in seconds, powered by GPT-4o for unmatched quality and speed." },
  { Icon: SparkleIcon, title: "Matches Your Writing Style",     desc: "Paste a sample of your writing and the AI mimics your personal style — making it virtually undetectable." },
];

const STEPS = [
  { num: "01", title: "Paste Your AI Text",        desc: "Drop any AI-generated content into the editor. No formatting or cleanup needed." },
  { num: "02", title: "Choose Your Mode",           desc: "Standard for everyday writing. Aggressive for robotic text. Academic for essays and research." },
  { num: "03", title: "Get Human Writing Instantly",desc: "Hit Humanize and receive text that flows, sounds natural, and beats every detector." },
];

const TESTIMONIALS = [
  {
    initials: "SM", name: "Sarah M.",  role: "Content Creator",    stars: 5,
    quote: "I was skeptical at first, but HumanizeIt saved my content strategy. My posts no longer get flagged — and they honestly read way better too.",
  },
  {
    initials: "JT", name: "James T.",  role: "Graduate Student",   stars: 5,
    quote: "My essays used to sound like a robot wrote them. Now they sound like me. I've gotten nothing but top marks since I started using this.",
  },
  {
    initials: "PK", name: "Priya K.",  role: "Marketing Manager",  stars: 5,
    quote: "We produce a ton of AI content for clients. HumanizeIt is now a non-negotiable step in our workflow. The Aggressive mode is genuinely unreal.",
  },
];

const STATS = [
  ["50K+", "Happy Users"],
  ["99%",  "Detection Bypass Rate"],
  ["< 5s", "Avg. Turnaround"],
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [dark, setDark]       = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [annual, setAnnual]   = useState(false);

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  const d = dark;

  // ── Theme tokens ─────────────────────────────────────────────────────────
  const t = {
    page:      d ? "bg-[#0a0a0a] text-white"                : "bg-[#fafafa] text-gray-900",
    navBg:     scrolled
      ? (d ? "bg-[#0a0a0a]/88 backdrop-blur-2xl border-b border-white/[0.06]"
           :  "bg-white/88 backdrop-blur-2xl border-b border-gray-200")
      : "bg-transparent",
    navLink:   d ? "text-white/50 hover:text-white"          : "text-gray-500 hover:text-gray-900",
    toggleBtn: d ? "bg-white/[0.07] hover:bg-white/[0.12] text-white/55 hover:text-white/85"
                 : "bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800",
    sub:       d ? "text-white/50"                           : "text-gray-500",
    muted:     d ? "text-white/38"                           : "text-gray-400",
    faint:     d ? "text-white/20"                           : "text-gray-300",
    card:      d ? "bg-[#111111] border-white/[0.07]"        : "bg-white border-gray-200",
    cardHover: d ? "hover:border-orange-500/25 hover:bg-[#141210]" : "hover:border-orange-200 hover:bg-orange-50/40",
    step:      d ? "bg-[#0f0f0f] border-white/[0.06]"        : "bg-gray-50 border-gray-100",
    stepHover: d ? "hover:border-orange-500/20"              : "hover:border-orange-200",
    divider:   d ? "bg-white/[0.06]"                         : "bg-gray-200",
    badgeBg:   d ? "bg-orange-500/10 border-orange-500/20 text-orange-400" : "bg-orange-50 border-orange-200 text-orange-600",
    reviewCard:d ? "bg-[#111111] border-white/[0.07]"        : "bg-white border-gray-200",
    reviewHov: d ? "hover:border-orange-500/20"              : "hover:border-orange-200",
    avatar:    d ? "bg-orange-500/10 border-orange-500/20 text-orange-300" : "bg-orange-50 border-orange-200 text-orange-500",
    heroBorder:d ? "border-white/[0.08]"                     : "border-gray-200",
    ctaBanner: d ? "bg-gradient-to-br from-[#1c1000] to-[#0f0a00] border-orange-500/20" : "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200",
    outlineCta:d ? "border-2 border-white/15 text-white/65 hover:border-orange-500/50 hover:text-white"
                 : "border-2 border-gray-200 text-gray-600 hover:border-orange-300 hover:text-gray-900",
    footer:    d ? "border-white/[0.07]"                     : "border-gray-200",
    socialBtn: d ? "border-white/[0.07] text-white/35 hover:border-orange-500/30 hover:text-orange-400 hover:bg-orange-500/[0.06]"
                 : "border-gray-200 text-gray-400 hover:border-orange-300 hover:text-orange-500 hover:bg-orange-50",
  };

  const orangeBtn = "bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-xl shadow-orange-900/30 hover:shadow-orange-900/55 hover:from-orange-400 hover:to-amber-400 hover:scale-[1.02] transition-all duration-200";

  return (
    <div className={`${sora.variable} font-[family-name:var(--font-sora)] min-h-screen ${t.page} transition-colors duration-300`}>

      {/* ── Ambient hero blobs ── */}
      <div aria-hidden className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {d ? (
          <>
            <div className="animate-blob   absolute -top-[15%] left-[15%]  w-[750px] h-[650px] rounded-full bg-orange-500/[0.065] blur-[140px]" />
            <div className="animate-blob-b absolute  top-[10%] right-[5%]  w-[500px] h-[420px] rounded-full bg-amber-600/[0.04]  blur-[120px]" />
          </>
        ) : (
          <div className="animate-blob absolute -top-[10%] left-[15%] w-[700px] h-[600px] rounded-full bg-orange-200/50 blur-[140px]" />
        )}
      </div>

      {/* ═══════════════ NAVBAR ═══════════════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${t.navBg}`}>
        <div className="max-w-[1160px] mx-auto px-6 py-[14px] flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="absolute inset-0 bg-orange-500 rounded-xl blur-[10px] opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-900/25">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1L8.6 5.6H13.8L9.6 8.5L11.2 13.4L7 10.5L2.8 13.4L4.4 8.5L0.2 5.6H5.4L7 1Z" fill="white"/>
                </svg>
              </div>
            </div>
            <span className={`text-[15px] font-bold tracking-tight ${d ? "text-white/95" : "text-gray-900"}`}>
              HumanizeIt
            </span>
          </Link>

          {/* Center links */}
          <div className="hidden md:flex items-center gap-8">
            {[["Features", "#features"], ["Pricing", "#pricing"], ["How It Works", "#how-it-works"], ["Login", "/login"]].map(([label, href]) => (
              <Link key={label} href={href} className={`text-sm font-medium transition-colors duration-150 ${t.navLink}`}>
                {label}
              </Link>
            ))}
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDark(!dark)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${t.toggleBtn}`}
              aria-label="Toggle dark/light mode"
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
            <Link href="/signup" className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm ${orangeBtn}`}>
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Page body ─────────────────────────────────────────────────────── */}
      <div className="relative z-10">

        {/* ═══════════════ HERO ═══════════════ */}
        <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-28 pb-24">

          {/* Badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold mb-8 ${t.badgeBg}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            Powered by GPT-4o &nbsp;·&nbsp; Trusted by 50,000+ users
          </div>

          {/* Headline */}
          <h1 className={`text-[4.5rem] sm:text-[5.5rem] font-black tracking-[-0.04em] leading-[1.0] max-w-[840px] mb-7 ${d ? "text-white" : "text-gray-900"}`}>
            Make AI Write<br />
            <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              Like You
            </span>
          </h1>

          <p className={`text-lg sm:text-xl max-w-[480px] mb-11 leading-[1.65] ${t.sub}`}>
            Transform robotic AI text into natural, undetectable human writing in seconds.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link href="/app" className={`flex items-center gap-2.5 px-9 py-[15px] rounded-2xl text-base ${orangeBtn}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1L9.8 6.2H15.2L10.7 9.4L12.5 14.6L8 11.4L3.5 14.6L5.3 9.4L0.8 6.2H6.2L8 1Z" fill="currentColor"/>
              </svg>
              Start for Free
            </Link>
            <a href="#how-it-works" className={`flex items-center gap-2 px-9 py-[15px] rounded-2xl text-base font-bold transition-all duration-200 ${t.outlineCta}`}>
              See How It Works <ArrowRight />
            </a>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-10 sm:gap-14 mt-16">
            {STATS.map(([val, label]) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <span className={`text-[1.7rem] font-black tracking-tight ${d ? "text-white" : "text-gray-900"}`}>{val}</span>
                <span className={`text-xs font-medium ${t.muted}`}>{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════ BEFORE / AFTER ═══════════════ */}
        <section className="px-6 pb-28">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-10">
              <span className={`text-xs font-bold uppercase tracking-[0.13em] text-orange-400 mb-3 block`}>Live Comparison</span>
              <h2 className={`text-[2.2rem] font-black tracking-tight ${d ? "text-white" : "text-gray-900"}`}>See the Difference</h2>
              <p className={`mt-2 text-base ${t.sub}`}>Same content — one robotic, one real.</p>
            </div>

            <div
              className={`grid grid-cols-2 rounded-3xl border overflow-hidden ${t.card}`}
              style={d
                ? { boxShadow: "0 0 0 1px rgba(249,115,22,0.12), 0 0 70px rgba(249,115,22,0.09)" }
                : { boxShadow: "0 4px 50px rgba(249,115,22,0.07), 0 0 0 1px rgba(249,115,22,0.08)" }}
            >
              {/* Left — AI */}
              <div className={`p-9 border-r ${d ? "border-white/[0.07]" : "border-gray-100"}`}>
                <div className="flex items-center gap-2 mb-5">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  <span className="text-[11px] font-black uppercase tracking-[0.14em] text-red-400">AI Generated</span>
                </div>
                <p className={`text-[14.5px] leading-[1.9] ${t.muted}`}>
                  The implementation of artificial intelligence technologies in contemporary business environments has demonstrated substantial potential for the optimization of operational efficiency metrics. It is furthermore noteworthy that the strategic utilization of machine learning algorithms has yielded considerable improvements in predictive analytical capabilities.
                </p>
              </div>

              {/* Right — Human */}
              <div className="p-9">
                <div className="flex items-center gap-2 mb-5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-400">Humanized</span>
                </div>
                <p className={`text-[14.5px] leading-[1.9] ${d ? "text-white/80" : "text-gray-700"}`}>
                  AI is reshaping how businesses operate — and the results are hard to ignore. Teams leaning into machine learning aren&#39;t just saving time, they&#39;re catching problems before they even surface. That&#39;s a genuine edge, and more companies are waking up to it every single day.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ HOW IT WORKS ═══════════════ */}
        <section id="how-it-works" className="px-6 pb-28">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-14">
              <span className="text-xs font-bold uppercase tracking-[0.13em] text-orange-400 mb-3 block">How It Works</span>
              <h2 className={`text-[2.2rem] font-black tracking-tight ${d ? "text-white" : "text-gray-900"}`}>3 Simple Steps</h2>
            </div>

            <div className="grid grid-cols-3 gap-5 relative">
              {/* Connector line */}
              <div className={`absolute top-[42px] left-[calc(16.7%+32px)] right-[calc(16.7%+32px)] h-px ${t.divider}`} />

              {STEPS.map((s) => (
                <div
                  key={s.num}
                  className={`flex flex-col items-center text-center px-8 py-9 rounded-2xl border transition-all duration-200 ${t.step} ${t.stepHover}`}
                >
                  <div className="w-[52px] h-[52px] rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mb-5 shadow-lg shadow-orange-900/30 text-white text-sm font-black">
                    {s.num}
                  </div>
                  <h3 className={`text-[15px] font-bold mb-2.5 ${d ? "text-white/90" : "text-gray-900"}`}>{s.title}</h3>
                  <p className={`text-[13.5px] leading-relaxed ${t.muted}`}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════ FEATURES ═══════════════ */}
        <section id="features" className="px-6 pb-28">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-14">
              <span className="text-xs font-bold uppercase tracking-[0.13em] text-orange-400 mb-3 block">Features</span>
              <h2 className={`text-[2.2rem] font-black tracking-tight ${d ? "text-white" : "text-gray-900"}`}>
                Built to Perform
              </h2>
              <p className={`mt-3 text-base max-w-[420px] mx-auto ${t.sub}`}>
                Everything you need to go from detectable AI output to natural human writing.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className={`flex items-start gap-5 p-7 rounded-2xl border cursor-default transition-all duration-200 ${t.card} ${t.cardHover}`}
                >
                  <div className="shrink-0 w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                    <f.Icon />
                  </div>
                  <div>
                    <h3 className={`text-[15px] font-bold mb-1.5 ${d ? "text-white/90" : "text-gray-900"}`}>{f.title}</h3>
                    <p className={`text-[13.5px] leading-relaxed ${t.muted}`}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════ PRICING ═══════════════ */}
        <section id="pricing" className="px-6 pb-28">
          <div className="max-w-[1240px] mx-auto">

            <div className="text-center mb-12">
              <span className="text-xs font-bold uppercase tracking-[0.13em] text-orange-400 mb-3 block">Pricing</span>
              <h2 className={`text-[2.2rem] font-black tracking-tight mb-3 ${d ? "text-white" : "text-gray-900"}`}>
                Simple, Transparent Pricing
              </h2>
              <p className={`text-base ${t.sub}`}>Start free. Upgrade anytime, cancel anytime.</p>
            </div>

            {/* ── Billing toggle ── */}
            <div className="flex items-center justify-center gap-3 mb-12">
              <span className={`text-sm font-semibold transition-colors duration-200 ${!annual ? (d ? "text-white/90" : "text-gray-900") : t.muted}`}>
                Monthly
              </span>

              <button
                onClick={() => setAnnual(!annual)}
                aria-label="Toggle billing period"
                className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none ${annual ? "bg-orange-500" : d ? "bg-white/[0.12]" : "bg-gray-200"}`}
              >
                <span className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-md transition-all duration-300 ${annual ? "left-[27px]" : "left-[3px]"}`} />
              </button>

              <span className={`text-sm font-semibold transition-colors duration-200 ${annual ? (d ? "text-white/90" : "text-gray-900") : t.muted}`}>
                Annual
              </span>

              {/* 2 MONTHS FREE badge — always in the DOM so layout doesn't shift */}
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border transition-all duration-300 ${
                annual
                  ? "bg-emerald-500/12 text-emerald-400 border-emerald-500/25 opacity-100 scale-100"
                  : "opacity-0 scale-90 pointer-events-none bg-transparent border-transparent text-transparent"
              }`}>
                2 MONTHS FREE
              </span>
            </div>

            {/* ── Cards ── */}
            <div className="grid grid-cols-4 gap-4 items-start">

              {/* Free */}
              <div className={`rounded-2xl border p-7 flex flex-col transition-all duration-200 ${t.card} ${t.cardHover}`}>
                <p className={`text-[11px] font-black uppercase tracking-[0.14em] mb-4 ${t.muted}`}>Free</p>

                <div className="mb-6">
                  <div className="flex items-end gap-1.5 mb-1">
                    <span className={`text-[2.5rem] font-black tracking-tight leading-none ${d ? "text-white" : "text-gray-900"}`}>$0</span>
                    <span className={`text-sm font-semibold mb-[5px] ${t.muted}`}>/month</span>
                  </div>
                  <p className={`text-[13px] ${t.muted}`}>250 words / month</p>
                </div>

                <div className="flex flex-col gap-3 mb-8 flex-1">
                  {["250 words per month", "Standard mode only", "Community support"].map((feat) => (
                    <div key={feat} className="flex items-start gap-2.5">
                      <svg className="w-[14px] h-[14px] mt-[2px] shrink-0 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span className={`text-[13.5px] ${d ? "text-white/60" : "text-gray-500"}`}>{feat}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/app"
                  className={`w-full flex items-center justify-center py-3 rounded-xl text-sm font-bold border-2 transition-all duration-200 ${
                    d
                      ? "border-white/[0.12] text-white/50 hover:border-orange-500/35 hover:text-white/80"
                      : "border-gray-200 text-gray-500 hover:border-orange-300 hover:text-gray-900"
                  }`}
                >
                  Get Started Free
                </Link>
              </div>

              {/* Trial */}
              <div className={`rounded-2xl border p-7 flex flex-col relative transition-all duration-200 ${t.card} ${t.cardHover}`}>
                {/* 7 Day Trial badge */}
                <div className="absolute -top-[13px] inset-x-0 flex justify-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[9.5px] font-black uppercase tracking-widest bg-orange-500/15 text-orange-400 border border-orange-500/30 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                    7 Day Trial
                  </span>
                </div>

                <p className={`text-[11px] font-black uppercase tracking-[0.14em] mb-4 text-orange-400`}>Trial</p>

                <div className="mb-6">
                  <div className="flex items-end gap-1.5 mb-1">
                    <span className={`text-[2.5rem] font-black tracking-tight leading-none ${d ? "text-white" : "text-gray-900"}`}>$1.99</span>
                  </div>
                  <p className={`text-[12px] font-semibold text-orange-400/80 mb-0.5`}>for 7 days</p>
                  <p className={`text-[12px] ${t.muted}`}>then cancel anytime</p>
                </div>

                <div className="flex flex-col gap-3 mb-8 flex-1">
                  {["500 words to use", "All 3 writing modes", "Cancel anytime"].map((feat) => (
                    <div key={feat} className="flex items-start gap-2.5">
                      <svg className="w-[14px] h-[14px] mt-[2px] shrink-0 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span className={`text-[13.5px] ${d ? "text-white/60" : "text-gray-500"}`}>{feat}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/signup?plan=trial"
                  className="w-full flex items-center justify-center py-3 rounded-xl text-sm font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30 hover:bg-orange-500/25 hover:border-orange-500/50 transition-all duration-200"
                >
                  Start Trial — $1.99
                </Link>
              </div>

              {/* Pro — highlighted */}
              <div
                className={`rounded-2xl border p-7 flex flex-col relative ${
                  d ? "bg-[#140e03] border-orange-500/40" : "bg-white border-orange-400/55"
                }`}
                style={{ boxShadow: d
                  ? "0 0 0 1px rgba(249,115,22,0.22), 0 0 60px rgba(249,115,22,0.15)"
                  : "0 0 0 1px rgba(249,115,22,0.18), 0 8px 50px rgba(249,115,22,0.12)"
                }}
              >
                {/* Most Popular badge */}
                <div className="absolute -top-[15px] inset-x-0 flex justify-center">
                  <span className="inline-flex items-center px-4 py-1.5 text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full shadow-lg shadow-orange-900/35">
                    Most Popular
                  </span>
                </div>

                <p className="text-[11px] font-black uppercase tracking-[0.14em] mb-4 text-orange-400">Pro</p>

                <div className="mb-6">
                  <div className="flex items-end gap-1.5 mb-1">
                    {annual && (
                      <span className={`text-sm font-semibold line-through self-end mb-[5px] mr-0.5 ${t.muted}`}>$12.99</span>
                    )}
                    <span className={`text-[2.5rem] font-black tracking-tight leading-none ${d ? "text-white" : "text-gray-900"}`}>
                      ${annual ? "10.99" : "12.99"}
                    </span>
                    <span className={`text-sm font-semibold mb-[5px] ${t.muted}`}>/month</span>
                  </div>
                  <p className={`text-[13px] ${t.muted}`}>50,000 words / month</p>
                </div>

                <div className="flex flex-col gap-3 mb-8 flex-1">
                  {["50,000 words per month", "All 3 writing modes", "AI detector bypass", "Priority support"].map((feat) => (
                    <div key={feat} className="flex items-start gap-2.5">
                      <svg className="w-[14px] h-[14px] mt-[2px] shrink-0 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span className={`text-[13.5px] ${d ? "text-white/82" : "text-gray-700"}`}>{feat}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/app"
                  className="w-full flex items-center justify-center py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-900/30 hover:shadow-orange-900/50 hover:from-orange-400 hover:to-amber-400 transition-all duration-200"
                >
                  Start Pro
                </Link>
              </div>

              {/* Unlimited */}
              <div className={`rounded-2xl border p-7 flex flex-col transition-all duration-200 ${t.card} ${t.cardHover}`}>
                <p className={`text-[11px] font-black uppercase tracking-[0.14em] mb-4 ${t.muted}`}>Unlimited</p>

                <div className="mb-6">
                  <div className="flex items-end gap-1.5 mb-1">
                    {annual && (
                      <span className={`text-sm font-semibold line-through self-end mb-[5px] mr-0.5 ${t.muted}`}>$29.99</span>
                    )}
                    <span className={`text-[2.5rem] font-black tracking-tight leading-none ${d ? "text-white" : "text-gray-900"}`}>
                      ${annual ? "24.99" : "29.99"}
                    </span>
                    <span className={`text-sm font-semibold mb-[5px] ${t.muted}`}>/month</span>
                  </div>
                  <p className={`text-[13px] ${t.muted}`}>Unlimited words</p>
                </div>

                <div className="flex flex-col gap-3 mb-8 flex-1">
                  {["Unlimited words", "All writing modes", "Fastest processing", "Priority support", "Early access to features"].map((feat) => (
                    <div key={feat} className="flex items-start gap-2.5">
                      <svg className="w-[14px] h-[14px] mt-[2px] shrink-0 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span className={`text-[13.5px] ${d ? "text-white/60" : "text-gray-500"}`}>{feat}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/app"
                  className={`w-full flex items-center justify-center py-3 rounded-xl text-sm font-bold border-2 transition-all duration-200 ${
                    d
                      ? "border-white/[0.12] text-white/50 hover:border-orange-500/35 hover:text-white/80"
                      : "border-gray-200 text-gray-500 hover:border-orange-300 hover:text-gray-900"
                  }`}
                >
                  Go Unlimited
                </Link>
              </div>

            </div>
          </div>
        </section>

        {/* ═══════════════ TESTIMONIALS ═══════════════ */}
        <section className="px-6 pb-28">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-14">
              <span className="text-xs font-bold uppercase tracking-[0.13em] text-orange-400 mb-3 block">Testimonials</span>
              <h2 className={`text-[2.2rem] font-black tracking-tight mb-3 ${d ? "text-white" : "text-gray-900"}`}>
                Loved by Creators
              </h2>
              <p className={`text-base ${t.sub}`}>
                Writers, students, and marketers rely on HumanizeIt every day.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {TESTIMONIALS.map((r) => (
                <div
                  key={r.name}
                  className={`flex flex-col p-7 rounded-2xl border transition-all duration-200 ${t.reviewCard} ${t.reviewHov}`}
                >
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => <StarIcon key={i} filled={i < r.stars} />)}
                  </div>
                  <p className={`text-[13.5px] leading-[1.85] mb-6 flex-1 ${d ? "text-white/55" : "text-gray-500"}`}>
                    &#8220;{r.quote}&#8221;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full border flex items-center justify-center text-[12px] font-black ${t.avatar}`}>
                      {r.initials}
                    </div>
                    <div>
                      <p className={`text-sm font-bold leading-tight ${d ? "text-white/85" : "text-gray-800"}`}>{r.name}</p>
                      <p className={`text-xs ${t.muted}`}>{r.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════ CTA BANNER ═══════════════ */}
        <section className="px-6 pb-28">
          <div className="max-w-[820px] mx-auto text-center">
            <div
              className={`rounded-3xl px-10 py-16 border ${t.ctaBanner}`}
              style={d ? { boxShadow: "0 0 70px rgba(249,115,22,0.09)" } : {}}
            >
              <h2 className={`text-[2.4rem] font-black tracking-tight mb-4 ${d ? "text-white" : "text-gray-900"}`}>
                Ready to Sound Human?
              </h2>
              <p className={`text-lg mb-9 ${t.sub}`}>
                Start for free. No credit card required.
              </p>
              <Link href="/app" className={`inline-flex items-center gap-2.5 px-11 py-4 rounded-2xl text-base ${orangeBtn}`}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1L9.8 6.2H15.2L10.7 9.4L12.5 14.6L8 11.4L3.5 14.6L5.3 9.4L0.8 6.2H6.2L8 1Z" fill="currentColor"/>
                </svg>
                Start Humanizing for Free
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════════════ FOOTER ═══════════════ */}
        <footer className={`border-t px-6 py-12 ${t.footer}`}>
          <div className="max-w-[1000px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">

            {/* Logo + tagline */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-orange-500 rounded-xl blur-[8px] opacity-40" />
                <div className="relative w-7 h-7 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1L8.6 5.6H13.8L9.6 8.5L11.2 13.4L7 10.5L2.8 13.4L4.4 8.5L0.2 5.6H5.4L7 1Z" fill="white"/>
                  </svg>
                </div>
              </div>
              <span className={`text-sm font-bold ${d ? "text-white/75" : "text-gray-700"}`}>HumanizeIt</span>
              <span className={`text-sm ${t.muted} hidden sm:inline`}>— Making AI text feel human.</span>
            </div>

            {/* Social + copyright */}
            <div className="flex items-center gap-4">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-200 ${t.socialBtn}`}>
                <InstagramIcon />
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" aria-label="TikTok"
                className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-200 ${t.socialBtn}`}>
                <TikTokIcon />
              </a>
              <span className={`text-xs ${t.faint}`}>
                © {new Date().getFullYear()} HumanizeIt. All rights reserved.
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
