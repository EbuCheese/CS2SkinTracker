import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const marketplaces = [
      { name: 'csfloat', url: 'https://prices.csgotrader.app/latest/csfloat.json' },
      { name: 'steam', url: 'https://prices.csgotrader.app/latest/steam.json' },
      { name: 'skinport', url: 'https://prices.csgotrader.app/latest/skinport.json' },
      { name: 'buff163', url: 'https://prices.csgotrader.app/latest/buff163.json' }
    ]

    const results = []
    console.log('Starting market price update...')

    for (const marketplace of marketplaces) {
      const startTime = Date.now()
      
      try {
        console.log(`Fetching ${marketplace.name} prices...`)
        
        const response = await fetch(marketplace.url, {
          headers: {
            'User-Agent': 'InvestmentTracker/1.0',
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(30000) // 30 second timeout
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const priceData = await response.json()
        const itemCount = Object.keys(priceData).length
        
        console.log(`Fetched ${itemCount} items from ${marketplace.name}`)
        
        // Call your existing update_market_prices function
        const { data, error } = await supabase.rpc('bulk_update_market_prices', {
          marketplace_name: marketplace.name,
          price_data: priceData
        })
        
        if (error) {
          console.error(`Database error for ${marketplace.name}:`, error)
          throw error
        }
        
        const duration = Date.now() - startTime
        console.log(`${marketplace.name} completed in ${duration}ms`)
        
        results.push({
          marketplace: marketplace.name,
          success: true,
          duration: duration,
          items_fetched: itemCount,
          ...data
        })
        
      } catch (error) {
        const duration = Date.now() - startTime
        console.error(`Error updating ${marketplace.name}:`, error.message)
        
        results.push({
          marketplace: marketplace.name,
          success: false,
          duration: duration,
          error: error.message
        })
      }
    }

    const totalSuccess = results.filter(r => r.success).length
    const totalItems = results.reduce((sum, r) => sum + (r.items_fetched || 0), 0)

    console.log(`Update completed: ${totalSuccess}/${results.length} marketplaces successful`)

    return new Response(
      JSON.stringify({
        success: totalSuccess > 0,
        timestamp: new Date().toISOString(),
        summary: {
          successful_marketplaces: totalSuccess,
          total_marketplaces: results.length,
          total_items_processed: totalItems
        },
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: totalSuccess > 0 ? 200 : 500,
      },
    )

  } catch (error) {
    console.error('Fatal error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})