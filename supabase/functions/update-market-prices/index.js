import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MARKETPLACE_CONFIGS = {
  steam: { 
    batchSize: 1500,
    timeout: 30000,
    dbChunkSize: 800
  },
  csfloat: { 
    batchSize: 1500,
    timeout: 30000,
    dbChunkSize: 800
  },
  skinport: { 
    batchSize: 1000,
    timeout: 35000,
    dbChunkSize: 500
  },
  buff163: { 
    batchSize: 800,
    timeout: 70000,
    dbChunkSize: 400
  },
};

async function preprocessBatch(marketplace, batchData) {
  // Pre-deduplicate at the source level to prevent conflicts
  const seenKeys = new Set();
  const deduplicatedData = {};
  
  for (const [itemName, itemData] of Object.entries(batchData)) {
    // Generate base key for deduplication check
    const baseKey = itemName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    if (marketplace === 'buff163' && itemData?.starting_at?.doppler) {
      // For buff163 doppler items, check all potential phase keys
      const phases = Object.keys(itemData.starting_at.doppler || {});
      let hasValidPhase = false;
      
      for (const phase of phases) {
        const phaseKey = `${baseKey}_${phase.toLowerCase()}`;
        if (!seenKeys.has(phaseKey)) {
          seenKeys.add(phaseKey);
          hasValidPhase = true;
        }
      }
      
      if (hasValidPhase) {
        deduplicatedData[itemName] = itemData;
      }
    } else if (marketplace !== 'buff163' && itemData?.doppler) {
      // For other marketplace doppler items
      const phases = Object.keys(itemData.doppler || {});
      let hasValidPhase = false;
      
      for (const phase of phases) {
        const phaseKey = `${baseKey}_${phase.toLowerCase()}`;
        if (!seenKeys.has(phaseKey)) {
          seenKeys.add(phaseKey);
          hasValidPhase = true;
        }
      }
      
      if (hasValidPhase) {
        deduplicatedData[itemName] = itemData;
      }
    } else {
      // Regular items - check for duplicates
      if (!seenKeys.has(baseKey)) {
        seenKeys.add(baseKey);
        deduplicatedData[itemName] = itemData;
      } else {
        console.warn(`Skipping duplicate item: ${itemName}`);
      }
    }
  }
  
  return deduplicatedData;
}

// Validate a batch of price data before sending to the DB
function validatePriceData(data) {
  if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
    return { valid: false, skippedKeys: Object.keys(data || {}) };
  }

  const skippedKeys = [];

  const hasValidItem = Object.entries(data).some(([key, item]) => {
    const valid =
      item &&
      typeof item === "object" &&
      (
        item.price ||
        item.starting_at ||
        item.highest_order ||
        item.last_24h ||
        item.last_7d ||
        item.last_30d ||
        item.last_90d
      );

    if (!valid) skippedKeys.push(key);
    return valid;
  });

  return { valid: hasValidItem, skippedKeys };
}

async function updateMarketplace(supabase, marketplace, priceData) {
  const config = MARKETPLACE_CONFIGS[marketplace.name];
  const itemKeys = Object.keys(priceData);
  const totalItems = itemKeys.length;
  let processedItems = 0;
  let successfulBatches = 0;
  let failedBatches = 0;

  console.log(`Processing ${totalItems} items for ${marketplace.name} in batches of ${config.batchSize}`);

  for (let i = 0; i < totalItems; i += config.batchSize) {
    const batchStart = Date.now();
    const batchKeys = itemKeys.slice(i, i + config.batchSize);
    const rawBatchData = {};
    
    batchKeys.forEach((key) => {
      rawBatchData[key] = priceData[key];
    });

    // Preprocess batch to remove potential duplicates
    const batchData = await preprocessBatch(marketplace.name, rawBatchData);
    const actualBatchSize = Object.keys(batchData).length;
    
    if (actualBatchSize === 0) {
      console.log(`Skipping empty batch ${Math.floor(i / config.batchSize) + 1} for ${marketplace.name}`);
      continue;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    // Validate batch
    const { valid, skippedKeys } = validatePriceData(batchData);
    if (!valid) {
      console.warn(
        `Skipping invalid/empty batch ${Math.floor(i / config.batchSize) + 1} for ${marketplace.name}`,
        skippedKeys.length > 0 ? `Skipped keys: ${skippedKeys.join(", ")}` : ""
      );
      continue;
    }

    try {
      const { data, error } = await supabase.rpc(
        "bulk_update_market_prices",
        {
          marketplace_name: marketplace.name,
          price_data: batchData,
          chunk_size: config.dbChunkSize,
        },
        { signal: controller.signal },
      );

      if (error) {
        console.error(
          `DB error in ${marketplace.name} batch ${Math.floor(i / config.batchSize) + 1}:`,
          error,
        );
        
        if (error.code === '21000') {
          console.warn(`Duplicate key conflict in batch, but continuing...`);
          failedBatches++;
        } else {
          throw error;
        }
      } else {
        successfulBatches++;
        console.log(`✓ Batch ${Math.floor(i / config.batchSize) + 1} processed: ${data?.processed_items || actualBatchSize} items`);
      }

      const batchDuration = Date.now() - batchStart;
      processedItems += actualBatchSize;
      
      console.log(
        `${marketplace.name} batch ${Math.floor(i / config.batchSize) + 1}: ${actualBatchSize} items in ${batchDuration}ms (${processedItems}/${totalItems} total)`
      );

      // Adaptive pause based on marketplace and performance
      const pauseTime = marketplace.name === 'buff163' ? 300 : 150;
      await new Promise((res) => setTimeout(res, pauseTime));
      
    } catch (error) {
      console.error(`Batch failed for ${marketplace.name}:`, error.message);
      failedBatches++;
      
      // For critical errors, continue with next batch instead of failing completely
      if (error.name === 'AbortError') {
        console.warn(`Batch timeout for ${marketplace.name}, continuing with next batch...`);
      } else if (error.code === '21000') {
        console.warn(`Duplicate conflict in ${marketplace.name}, continuing...`);
      } else {
        // For other errors, we might want to retry smaller batches
        console.warn(`Unexpected error in ${marketplace.name}, continuing...`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  console.log(`${marketplace.name} summary: ${successfulBatches} successful, ${failedBatches} failed batches`);
  return { processedItems, successfulBatches, failedBatches };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Process marketplaces in order of complexity (simple first)
    const marketplaces = [
      { name: "steam", url: "https://prices.csgotrader.app/latest/steam.json" },
      { name: "csfloat", url: "https://prices.csgotrader.app/latest/csfloat.json" },
      { name: "skinport", url: "https://prices.csgotrader.app/latest/skinport.json" },
      { name: "buff163", url: "https://prices.csgotrader.app/latest/buff163.json" },
    ];

    const results = [];
    console.log("Starting market price update...");

    for (const marketplace of marketplaces) {
      const startTime = Date.now();
      try {
        console.log(`Fetching ${marketplace.name} prices...`);

        const response = await fetch(marketplace.url, {
          headers: {
            "User-Agent": "InvestmentTracker/1.0",
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate",
          },
          signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const priceData = await response.json();
        const fetchedItems = Object.keys(priceData).length;
        console.log(`Fetched ${fetchedItems} items from ${marketplace.name}`);

        if (fetchedItems === 0) {
          console.warn(`No items fetched from ${marketplace.name}, skipping...`);
          continue;
        }

        const updateResult = await updateMarketplace(supabase, marketplace, priceData);
        const duration = Date.now() - startTime;
        
        console.log(`${marketplace.name} completed: ${updateResult.processedItems} items processed in ${duration}ms`);

        results.push({
          marketplace: marketplace.name,
          success: updateResult.successfulBatches > 0,
          duration,
          items_fetched: fetchedItems,
          items_processed: updateResult.processedItems,
          successful_batches: updateResult.successfulBatches,
          failed_batches: updateResult.failedBatches,
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`Error updating ${marketplace.name}:`, error.message);

        results.push({
          marketplace: marketplace.name,
          success: false,
          duration,
          error: error.message,
          items_fetched: 0,
          items_processed: 0,
          successful_batches: 0,
          failed_batches: 1,
        });
      }
    }

    const totalSuccess = results.filter((r) => r.success).length;
    const totalItemsProcessed = results.reduce(
      (sum, r) => sum + (r.items_processed || 0),
      0,
    );
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    console.log(
      `Update completed: ${totalSuccess}/${results.length} marketplaces successful, ${totalItemsProcessed} items in ${totalDuration}ms`,
    );

    return new Response(
      JSON.stringify({
        success: totalSuccess > 0,
        timestamp: new Date().toISOString(),
        summary: {
          successful_marketplaces: totalSuccess,
          total_marketplaces: results.length,
          total_items_processed: totalItemsProcessed,
          total_duration_ms: totalDuration,
        },
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: totalSuccess > 0 ? 200 : 500,
      },
    );
  } catch (error) {
    console.error("Fatal error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});