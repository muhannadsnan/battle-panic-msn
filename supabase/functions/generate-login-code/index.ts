import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { email } = await req.json()

        if (!email) {
            return new Response(
                JSON.stringify({ error: 'Email is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // Generate 4-digit code
        const code = Math.floor(1000 + Math.random() * 9000).toString()

        // Delete any existing unused codes for this email
        await supabase
            .from('login_codes')
            .delete()
            .eq('email', email.toLowerCase())
            .eq('used', false)

        // Store new code in database
        const { error: insertError } = await supabase.from('login_codes').insert({
            email: email.toLowerCase(),
            code,
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
        })

        if (insertError) {
            console.error('Insert error:', insertError)
            return new Response(
                JSON.stringify({ error: 'Failed to generate code' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({ success: true, code }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
