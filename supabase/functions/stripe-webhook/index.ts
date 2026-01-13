import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Simple HMAC-SHA256 signature verification for Stripe webhooks
async function verifyStripeSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const parts = signature.split(',').reduce((acc, part) => {
      const [key, value] = part.split('=')
      acc[key] = value
      return acc
    }, {} as Record<string, string>)

    const timestamp = parts['t']
    const expectedSig = parts['v1']

    if (!timestamp || !expectedSig) return false

    const signedPayload = `${timestamp}.${payload}`
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
    const computedSig = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    return computedSig === expectedSig
  } catch (err) {
    console.error('Signature verification error:', err)
    return false
  }
}

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    console.log('No signature header')
    return new Response('No signature', { status: 400 })
  }

  const body = await req.text()
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

  // Verify signature
  const isValid = await verifyStripeSignature(body, signature, webhookSecret)
  if (!isValid) {
    console.error('Webhook signature verification failed')
    return new Response('Invalid signature', { status: 400 })
  }

  const event = JSON.parse(body)
  console.log('Received event:', event.type)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object

    console.log('Session ID:', session.id)
    console.log('Metadata:', JSON.stringify(session.metadata))

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

      } catch (error) {
        console.error('Error processing payment:', error)
      }
    } else {
      console.log('Missing userId or xpAmount, skipping XP credit')
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
})
