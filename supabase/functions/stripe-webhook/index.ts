import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  const body = await req.text()
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  console.log('Received event:', event.type)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.user_id
    const xpAmount = parseInt(session.metadata?.xp_amount || '0')

    console.log('Payment completed for user:', userId, 'XP amount:', xpAmount)

    if (userId && xpAmount > 0) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )

      try {
        // Get current save data
        const { data: saveRow, error: fetchError } = await supabase
          .from('saves')
          .select('save_data')
          .eq('user_id', userId)
          .single()

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('Error fetching save data:', fetchError)
          throw fetchError
        }

        let saveData = saveRow?.save_data || {}
        const oldXp = saveData.xp || 0
        saveData.xp = oldXp + xpAmount

        console.log('Updating XP from', oldXp, 'to', saveData.xp)

        // Upsert save data with new XP
        const { error: updateError } = await supabase
          .from('saves')
          .upsert({
            user_id: userId,
            save_data: saveData,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          })

        if (updateError) {
          console.error('Error updating save data:', updateError)
          throw updateError
        }

        console.log('Successfully credited', xpAmount, 'XP to user', userId)

        // Optional: Log payment for records
        await supabase.from('payments').insert({
          user_id: userId,
          stripe_payment_id: session.payment_intent,
          xp_amount: xpAmount,
          amount_cents: session.amount_total,
          status: 'completed'
        }).catch(err => {
          // Payments table might not exist, that's ok
          console.log('Could not log payment (table may not exist):', err.message)
        })

      } catch (error) {
        console.error('Error processing payment:', error)
        // Still return 200 to Stripe so they don't retry
        // But log the error for debugging
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
})
