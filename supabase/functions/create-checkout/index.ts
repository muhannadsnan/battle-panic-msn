import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, xp_amount, price_cents, success_url, cancel_url } = await req.json()

    if (!user_id || !xp_amount || !price_cents) {
      throw new Error('Missing required fields: user_id, xp_amount, price_cents')
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${xp_amount} XP for Battle Panic MSN`,
              description: `Support the game and receive ${xp_amount} XP instantly!`,
            },
            unit_amount: price_cents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: success_url || 'https://muhannadsnan.github.io/battle-panic-msn/?payment=success',
      cancel_url: cancel_url || 'https://muhannadsnan.github.io/battle-panic-msn/?payment=cancelled',
      metadata: {
        user_id,
        xp_amount: String(xp_amount),
      },
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Checkout session error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
