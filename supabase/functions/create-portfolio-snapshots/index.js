// supabase/functions/create-portfolio-snapshots/index.js

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TIMEOUT_MS = 25000;
const startTime = Date.now();

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role for admin access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get granularity from request (default to 'hourly')
    let granularity = 'hourly'
    try {
      const body = await req.json()
      granularity = body.granularity || 'hourly'
    } catch (e) {
      // If no body or invalid JSON, use default
    }

    // Validate granularity
    if (!['hourly', 'daily', 'monthly'].includes(granularity)) {
      return new Response(
        JSON.stringify({ error: 'Invalid granularity. Must be: hourly, daily, or monthly' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get all active beta users
    const { data: users, error: usersError } = await supabaseAdmin
      .rpc('get_active_beta_users')

    if (usersError) {
      throw usersError
    }

    // Convert to expected format
    const userList = users.map(row => ({ id: row.user_id }))

    console.log(`Creating ${granularity} snapshots for ${userList.length} users`)

    const results = {
      success: 0,
      failed: 0,
      errors: []
    }

    console.log('Sample user object:', JSON.stringify(userList[0]))

  // In the loop
  for (const user of userList) {
      if (Date.now() - startTime > TIMEOUT_MS) {
      console.warn('Approaching timeout, stopping early');
      results.errors.push({ 
        message: `Stopped after ${results.success + results.failed} users due to timeout` 
      });
      break;
    }
        try {
          const { data, error } = await supabaseAdmin.rpc('create_portfolio_snapshot', {
            context_user_id: user.id,
            p_granularity: granularity,
            p_snapshot_date: new Date().toISOString()
          })

          if (error) {
            console.error(`Failed for user ${user.id}:`, error)
            results.failed++
            results.errors.push({ user_id: user.id, error: error.message })
          } else {
            console.log(`Success for user ${user.id}`)
            results.success++
          }
        } catch (err) {
          console.error(`Exception for user ${user.id}:`, err)
          results.failed++
          results.errors.push({ user_id: user.id, error: String(err) })
        }
      }

    return new Response(
      JSON.stringify({
        message: 'Snapshot creation completed',
        granularity,
        total_users: users.length,
        ...results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})