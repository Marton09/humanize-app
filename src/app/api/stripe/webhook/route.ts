import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: unknown) {
    return NextResponse.json({ error: `Webhook Error: ${(err as Error).message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.userId
    const plan = session.metadata?.plan

    if (!userId || !plan) return NextResponse.json({ received: true })

    const now = new Date().toISOString()
    const trialStartDate = plan === 'trial' ? now : null

    // Update the usage table — this is what the UI reads from
    await supabase.from('usage').upsert(
      {
        user_id: userId,
        plan,
        words_used: 0,
        words_reset_at: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
        ...(trialStartDate ? { trial_start_date: trialStartDate } : {}),
      },
      { onConflict: 'user_id' }
    )

    // Also keep subscriptions table in sync
    let wordLimit = 500
    if (plan === 'pro') wordLimit = 50000
    if (plan === 'unlimited') wordLimit = 999999999

    const expiresAt = plan === 'trial'
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : null

    await supabase.from('subscriptions').upsert({
      user_id: userId,
      plan,
      word_limit: wordLimit,
      expires_at: expiresAt,
      updated_at: now,
    })
  }

  return NextResponse.json({ received: true })
}