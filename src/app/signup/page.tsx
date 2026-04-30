"use client";

import { useState } from "react";
import { Sora } from "next/font/google";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });
const supabase = createClient();

function SpinnerIcon() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
    </svg>
  );
}

const inputBase =
  "w-full bg-[#0d0d0d] border border-white/[0.08] rounded-xl px-4 py-3 text-[14.5px] text-white/85 placeholder:text-white/20 outline-none transition-all duration-150";

function focusGlow(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "rgba(249,115,22,0.5)";
  e.currentTarget.style.boxShadow   = "0 0 0 1px rgba(249,115,22,0.2), 0 0 24px rgba(249,115,22,0.08)";
}
function blurGlow(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "";
  e.currentTarget.style.boxShadow   = "";
}

export default function SignupPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password || !confirm) { setError("Please fill in all fields."); return; }
    if (password.length < 8)            { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm)           { setError("Passwords do not match."); return; }

    setLoading(true);
    setError("");

    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/app");
      router.refresh();
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  return (
    <div className={`${sora.variable} font-[family-name:var(--font-sora)] min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-4`}>

      {/* Ambient glow */}
      <div aria-hidden className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-orange-500/[0.07] blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-[420px]">

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

        {/* Card */}
        <div className="bg-[#111111] border border-white/[0.07] rounded-3xl p-8">

          {success ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <h2 className="text-xl font-black text-white mb-2">Check your email</h2>
              <p className="text-sm text-white/40 leading-relaxed max-w-[280px] mx-auto">
                We sent a confirmation link to <span className="text-orange-400 font-semibold">{email}</span>. Click it to activate your account.
              </p>
              <Link href="/login" className="inline-block mt-6 text-sm text-orange-400 hover:text-orange-300 font-semibold transition-colors">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-[1.6rem] font-black tracking-tight text-white mb-1">Create account</h1>
              <p className="text-sm text-white/35 mb-7">Start humanizing your AI text for free.</p>

              <form onSubmit={handleSignup} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-widest">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={focusGlow}
                    onBlur={blurGlow}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={inputBase}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-widest">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={focusGlow}
                    onBlur={blurGlow}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className={inputBase}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-widest">Confirm Password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    onFocus={focusGlow}
                    onBlur={blurGlow}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={inputBase}
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/[0.07] border border-red-500/20">
                    <svg className="w-4 h-4 text-red-400 mt-px shrink-0" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <p className="text-[13px] text-red-300/80 leading-relaxed">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="relative flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-200 disabled:cursor-not-allowed mt-1"
                >
                  <span className={`absolute inset-0 rounded-xl transition-all duration-200 ${
                    loading
                      ? "bg-white/[0.05]"
                      : "bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg shadow-orange-900/35 hover:shadow-orange-900/55 hover:from-orange-400 hover:to-amber-400"
                  }`} />
                  <span className={`relative flex items-center gap-2 ${loading ? "text-white/25" : "text-white"}`}>
                    {loading ? <><SpinnerIcon /> Creating account…</> : "Create Account"}
                  </span>
                </button>

                <p className="text-center text-xs text-white/20 leading-relaxed">
                  By signing up you agree to our{" "}
                  <span className="text-white/35 hover:text-orange-400 cursor-pointer transition-colors">Terms</span>
                  {" "}and{" "}
                  <span className="text-white/35 hover:text-orange-400 cursor-pointer transition-colors">Privacy Policy</span>.
                </p>
              </form>
            </>
          )}
        </div>

        {!success && (
          <p className="text-center text-sm text-white/30 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-orange-400 hover:text-orange-300 font-semibold transition-colors">
              Sign In
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}