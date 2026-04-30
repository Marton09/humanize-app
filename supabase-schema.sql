-- ─────────────────────────────────────────────────────────────
-- HumanizeIt — usage table
-- Run this in your Supabase SQL editor
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.usage (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan             TEXT NOT NULL DEFAULT 'free',      -- free | trial | pro | unlimited
  words_used       INTEGER NOT NULL DEFAULT 0,
  words_reset_at   TIMESTAMPTZ NOT NULL DEFAULT (
                     date_trunc('month', now() AT TIME ZONE 'UTC')
                     + INTERVAL '1 month'
                   ),
  trial_start_date DATE,                              -- set when plan = 'trial'
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  CONSTRAINT plan_values CHECK (plan IN ('free', 'trial', 'pro', 'unlimited'))
);

-- Row-Level Security
ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON public.usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own" ON public.usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own" ON public.usage
  FOR UPDATE USING (auth.uid() = user_id);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS usage_user_id_idx ON public.usage (user_id);
