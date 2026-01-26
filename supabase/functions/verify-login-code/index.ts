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
        const { email, code } = await req.json()

        if (!email || !code) {
            return new Response(
                JSON.stringify({ error: 'Email and code are required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // Verify code exists and is valid
        const { data: codeData, error: fetchError } = await supabase
            .from('login_codes')
            .select()
            .eq('email', email.toLowerCase())
            .eq('code', code)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .single()

        if (fetchError || !codeData) {
            return new Response(
                JSON.stringify({ error: 'Invalid or expired code' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Mark code as used
        await supabase
            .from('login_codes')
            .update({ used: true })
            .eq('id', codeData.id)

        // Generate a magic link for this user (creates user if doesn't exist)
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: email.toLowerCase(),
        })

        if (linkError || !linkData) {
            console.error('Link generation error:', linkError)
            return new Response(
                JSON.stringify({ error: 'Failed to authenticate' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Return the token_hash for client-side verification
        return new Response(
            JSON.stringify({
                success: true,
                token_hash: linkData.properties?.hashed_token,
                // Also return the full link as backup
                verification_url: linkData.properties?.action_link
            }),
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
