"use client";

import { useState, useCallback } from "react";
import { Sora } from "next/font/google";
import Link from "next/link";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });

type Mode = "standard" | "aggressive" | "academic";

const MODES: { id: Mode; label: string; desc: string }[] = [
  { id: "standard",   label: "Standard",   desc: "Natural, balanced rewrite for most content" },
  { id: "aggressive", label: "Aggressive",  desc: "Maximum transformation — best for robotic-sounding text" },
  { id: "academic",   label: "Academic",    desc: "Scholarly tone that still reads like a real person" },
];

function wc(text: string) {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1 7.5V1.5C1 1.22 1.22 1 1.5 1H7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
      <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export default function HumanizerPage() {
  const [input, setInput]     = useState("");
  const [output, setOutput]   = useState("");
  const [mode, setMode]       = useState<Mode>("standard");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [copied, setCopied]   = useState(false);
  const [dark, setDark]       = useState(true);

  const handleHumanize = useCallback(async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError("");
    setOutput("");
    try {
      const res  = await fetch("/api/humanize", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text: input, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setOutput(data.result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [input, mode, loading]);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const inputWords  = wc(input);
  const outputWords = wc(output);
  const canSubmit   = !loading && input.trim().length > 0;

  // ── Theme tokens ──────────────────────────────────────────────
  const d = dark;
  const tok = {
    page:       d ? "bg-[#0a0a0a] text-white"           : "bg-[#fafafa] text-gray-900",
    hdrBorder:  d ? "border-white/[0.06]"               : "border-gray-200",
    surface:    d ? "bg-[#111111]"                      : "bg-white",
    surfaceAlt: d ? "bg-[#0d0d0d]"                      : "bg-gray-50",
    border:     d ? "border-white/[0.07]"               : "border-gray-200",
    borderFaint:d ? "border-white/[0.05]"               : "border-gray-100",
    tabPill:    d ? "bg-white/[0.03] border-white/[0.06]":"bg-gray-100 border-gray-200",
    textMain:   d ? "text-white/85"                     : "text-gray-800",
    textMuted:  d ? "text-white/35"                     : "text-gray-400",
    textFaint:  d ? "text-white/20"                     : "text-gray-300",
    textDim:    d ? "text-white/18"                     : "text-gray-300",
    placeholder:d ? "placeholder:text-white/15"         : "placeholder:text-gray-300",
    modeInactive:d? "text-white/30 hover:text-white/65" : "text-gray-400 hover:text-gray-700",
    clearBtn:   d ? "bg-white/[0.05] hover:bg-white/[0.12] text-white/35 hover:text-white/70"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600",
    toggleBtn:  d ? "bg-white/[0.06] hover:bg-white/[0.11] text-white/55 hover:text-white/90"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800",
    copyBtn:    d ? "bg-white/[0.04] text-white/35 border-white/[0.07] hover:text-white/70 hover:border-white/[0.15] hover:bg-white/[0.07]"
                  : "bg-gray-50 text-gray-400 border-gray-200 hover:text-gray-700 hover:bg-gray-100",
    emptyIcon:  d ? "bg-white/[0.03] border-white/[0.05]" : "bg-gray-100 border-gray-200",
    loadingBg:  d ? "bg-[#120f0a] border-orange-500/25"   : "bg-orange-50 border-orange-200/60",
    disabledBtn:d ? "bg-white/[0.05] text-white/20"       : "bg-gray-100 text-gray-300",
  };

  const onTextareaFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = "rgba(249,115,22,0.45)";
    e.currentTarget.style.boxShadow   = "0 0 0 1px rgba(249,115,22,0.18), 0 0 38px rgba(249,115,22,0.08)";
    e.currentTarget.style.backgroundColor = d ? "#111318" : "#fffbf7";
  };
  const onTextareaBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = "";
    e.currentTarget.style.boxShadow   = "";
    e.currentTarget.style.backgroundColor = "";
  };

  return (
    <div className={`${sora.variable} font-[family-name:var(--font-sora)] min-h-screen flex flex-col transition-colors duration-300 ${tok.page}`}>

      {/* ── Ambient glow (dark only) ── */}
      {d && (
        <div aria-hidden className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[900px] h-[480px] rounded-full bg-orange-500/[0.07] blur-[140px]" />
          <div className="absolute top-1/2 right-0 w-[400px] h-[400px] rounded-full bg-amber-600/[0.04] blur-[120px]" />
        </div>
      )}

      {/* ── Header ── */}
      <header className={`relative z-20 border-b ${tok.hdrBorder} transition-colors duration-300`}>
        <div className="max-w-[1380px] mx-auto px-8 py-[14px] flex items-center justify-between">

          {/* Logo — back to landing page */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-8 h-8 bg-orange-500 rounded-xl blur-[12px] opacity-55 group-hover:opacity-75 transition-opacity duration-200" />
              <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-900/30">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1L8.6 5.6H13.8L9.6 8.5L11.2 13.4L7 10.5L2.8 13.4L4.4 8.5L0.2 5.6H5.4L7 1Z" fill="white" />
                </svg>
              </div>
            </div>
            <span className={`text-[15px] font-semibold tracking-tight transition-colors duration-200 ${d ? "text-white/85 group-hover:text-white" : "text-gray-700 group-hover:text-gray-900"}`}>
              HumanizeAI
            </span>
          </Link>

          {/* Right badges + toggle */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-[5px] text-[10.5px] font-bold uppercase tracking-widest text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              GPT-4o
            </span>

            <button
              onClick={() => setDark(!dark)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${tok.toggleBtn}`}
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="relative z-10 flex-1 flex flex-col max-w-[1380px] mx-auto w-full px-8 py-10 gap-8">

        {/* Hero */}
        <div className="text-center space-y-3 pt-1">
          <h1 className="text-[2.75rem] font-bold tracking-[-0.02em] leading-[1.12]">
            <span className={d ? "text-white/95" : "text-gray-900"}>Make AI Text Sound </span>
            <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              Human
            </span>
          </h1>
          <p className={`text-[15px] max-w-[400px] mx-auto leading-[1.65] ${tok.textMuted}`}>
            Paste AI-generated content and get a natural, undetectable rewrite in seconds.
          </p>
        </div>

        {/* ── Mode tabs ── */}
        <div className="flex flex-col items-center gap-3">
          <div className={`flex items-center gap-1 p-[6px] border rounded-2xl transition-colors duration-300 ${tok.tabPill}`}>
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`relative px-7 py-[10px] rounded-[11px] text-sm font-semibold transition-all duration-200 ${
                  mode === m.id ? "text-white" : tok.modeInactive
                }`}
              >
                {mode === m.id && (
                  <span className="absolute inset-0 rounded-[11px] bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg shadow-orange-900/35" />
                )}
                <span className="relative">{m.label}</span>
              </button>
            ))}
          </div>
          <p className={`text-[13px] min-h-[18px] transition-colors duration-200 ${tok.textFaint}`}>
            {MODES.find((m) => m.id === mode)?.desc}
          </p>
        </div>

        {/* ── Editor panels ── */}
        <div className="grid grid-cols-2 gap-5">

          {/* ── Input ── */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-[7px]">
                <div className={`w-[5px] h-[5px] rounded-full ${d ? "bg-white/25" : "bg-gray-300"}`} />
                <span className={`text-[11px] font-bold uppercase tracking-[0.12em] ${tok.textMuted}`}>
                  Original Text
                </span>
              </div>
              <span className={`text-[11px] tabular-nums ${tok.textFaint}`}>
                {inputWords} {inputWords === 1 ? "word" : "words"}
              </span>
            </div>

            <div className="relative group">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleHumanize(); }}
                onFocus={onTextareaFocus}
                onBlur={onTextareaBlur}
                placeholder="Paste your AI-generated text here…"
                className={`w-full h-[440px] border rounded-2xl px-6 py-5 text-[14.5px] resize-none leading-[1.8] outline-none transition-colors duration-150 ${tok.surface} ${tok.border} ${tok.textMain} ${tok.placeholder}`}
              />
              {input && (
                <button
                  onClick={() => { setInput(""); setOutput(""); setError(""); }}
                  className={`absolute top-3.5 right-3.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-150 opacity-0 group-hover:opacity-100 ${tok.clearBtn}`}
                  title="Clear"
                >
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <path d="M1 1L8 8M8 1L1 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* ── Output ── */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-[7px]">
                <div className={`w-[5px] h-[5px] rounded-full transition-colors duration-500 ${output ? "bg-orange-400" : d ? "bg-white/25" : "bg-gray-300"}`} />
                <span className={`text-[11px] font-bold uppercase tracking-[0.12em] ${tok.textMuted}`}>
                  Humanized Output
                </span>
              </div>

              {output && (
                <div className="flex items-center gap-3">
                  <span className={`text-[11px] tabular-nums ${tok.textFaint}`}>
                    {outputWords} {outputWords === 1 ? "word" : "words"}
                  </span>
                  <button
                    onClick={handleCopy}
                    className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-[5px] rounded-lg border transition-all duration-200 ${
                      copied
                        ? "bg-orange-500/15 text-orange-400 border-orange-500/30"
                        : tok.copyBtn
                    }`}
                  >
                    {copied ? <><CheckIcon /> Copied!</> : <><CopyIcon /> Copy</>}
                  </button>
                </div>
              )}
            </div>

            <div
              className={`relative h-[440px] rounded-2xl border overflow-auto transition-all duration-300 ${
                loading
                  ? tok.loadingBg
                  : output
                    ? `${tok.surface} ${tok.border}`
                    : `${tok.surfaceAlt} ${tok.borderFaint}`
              }`}
              style={loading ? { boxShadow: "0 0 40px rgba(249,115,22,0.08)" } : {}}
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-5">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-[2.5px] border-orange-500/20 border-t-orange-400 animate-spin" />
                    <div className="absolute inset-2 rounded-full bg-orange-500/10 blur-sm" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className={`text-sm font-semibold ${tok.textMuted}`}>Humanizing your text…</p>
                    <p className={`text-xs ${tok.textDim}`}>Rewriting with GPT-4o</p>
                  </div>
                </div>
              ) : error ? (
                <div className="p-6">
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/[0.06] border border-red-500/20">
                    <svg className="w-4 h-4 text-red-400 mt-px shrink-0" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                    <div>
                      <p className="text-[13px] font-semibold text-red-300/90 mb-0.5">Error</p>
                      <p className="text-[13px] text-red-300/65 leading-relaxed">{error}</p>
                    </div>
                  </div>
                </div>
              ) : output ? (
                <p className={`p-6 text-[14.5px] whitespace-pre-wrap leading-[1.8] ${tok.textMain}`}>
                  {output}
                </p>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${tok.emptyIcon}`}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M9 3.5v11M3.5 9h11" stroke={d ? "rgba(255,255,255,0.3)" : "#d1d5db"} strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className={`text-[13px] leading-relaxed max-w-[200px] ${tok.textDim}`}>
                    Your humanized output will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Humanize button ── */}
        <div className="flex flex-col items-center gap-3 pb-2">
          <button
            onClick={handleHumanize}
            disabled={!canSubmit}
            className="group relative flex items-center gap-2.5 px-12 py-[15px] rounded-2xl text-[15px] font-bold transition-all duration-200 disabled:cursor-not-allowed"
          >
            <span
              className={`absolute inset-0 rounded-2xl transition-all duration-200 ${
                canSubmit
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 shadow-2xl shadow-orange-900/40 group-hover:shadow-orange-900/55 group-hover:from-orange-400 group-hover:to-amber-400 group-hover:scale-[1.02]"
                  : tok.disabledBtn
              }`}
            />
            <span className={`relative flex items-center gap-2.5 tracking-[-0.01em] ${canSubmit ? "text-white" : ""}`}>
              {loading ? (
                <>
                  <SpinnerIcon className="w-[18px] h-[18px] animate-spin" />
                  Humanizing…
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1L9.8 6.2H15.2L10.7 9.4L12.5 14.6L8 11.4L3.5 14.6L5.3 9.4L0.8 6.2H6.2L8 1Z" fill="currentColor" fillOpacity="0.92" />
                  </svg>
                  Humanize Text
                </>
              )}
            </span>
          </button>

          <p className={`text-[12px] ${tok.textDim}`}>
            {inputWords > 0
              ? `${inputWords.toLocaleString()} words · ⌘ Enter to run`
              : "Paste text above to get started"}
          </p>
        </div>
      </main>
    </div>
  );
}
