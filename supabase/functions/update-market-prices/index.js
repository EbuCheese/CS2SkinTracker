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
    dbChunkSize: 1000,
  },
  csfloat: {
    batchSize: 1500,
    timeout: 30000,
    dbChunkSize: 1000,
  },
  skinport: {
    batchSize: 1000,
    timeout: 35000,
    dbChunkSize: 600,
  },
  buff163: {
    batchSize: 800,
    timeout: 70000,
    dbChunkSize: 400,
  },
};

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function preprocessBatch(marketplace, batchData) {
  const cleanedData = {};

  for (const [itemName, itemData] of Object.entries(batchData)) {
    if (itemData && typeof itemData === "object") {
      const hasValidPrice =
        itemData.price ||
        itemData.starting_at ||
        itemData.highest_order ||
        itemData.last_24h ||
        itemData.last_7d ||
        itemData.last_30d ||
        itemData.last_90d ||
        (itemData.starting_at && itemData.starting_at.price) ||
        (itemData.highest_order && itemData.highest_order.price);

      if (hasValidPrice) {
        cleanedData[itemName] = itemData;
      }
    }
  }

  return cleanedData;
}

async function updateMarketplace(supabase, marketplace, priceData, runId) {
  const config = MARKETPLACE_CONFIGS[marketplace.name];
  const itemKeys = Object.keys(priceData);
  const totalItems = itemKeys.length;
  const totalBatches = Math.ceil(totalItems / config.batchSize);

  let processedItems = 0;
  let successfulBatches = 0;
  let failedBatches = 0;

  console.log(
    `Processing ${totalItems} items for ${marketplace.name} in ${totalBatches} batches of ${config.batchSize} (run_id: ${runId})`
  );

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const batchStart = Date.now();
    const startIdx = batchIndex * config.batchSize;
    const endIdx = Math.min(startIdx + config.batchSize, totalItems);
    const batchKeys = itemKeys.slice(startIdx, endIdx);

    const rawBatchData = {};
    batchKeys.forEach((key) => {
      rawBatchData[key] = priceData[key];
    });

    const batchData = await preprocessBatch(marketplace.name, rawBatchData);
    const actualBatchSize = Object.keys(batchData).length;

    if (actualBatchSize === 0) {
      console.log(
        `Skipping empty batch ${batchIndex + 1}/${totalBatches} for ${marketplace.name}`
      );
      continue;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      console.log(
        `Processing batch ${batchIndex + 1}/${totalBatches} for ${marketplace.name}`
      );

      const { data, error } = await supabase.rpc(
        "bulk_update_market_prices",
        {
          marketplace_name: marketplace.name,
          price_data: batchData,
          p_run_id: runId,
          chunk_size: config.dbChunkSize,
        },
        { signal: controller.signal }
      );

      if (error) {
        console.error(
          `DB error in ${marketplace.name} batch ${batchIndex + 1}/${totalBatches}:`,
          error
        );
        failedBatches++;
      } else {
        successfulBatches++;
        console.log(
          `✓ Batch ${batchIndex + 1}/${totalBatches} processed: ${data?.successful_chunks || 0}/${(data?.successful_chunks || 0) + (data?.failed_chunks || 0)} chunks successful`
        );
      }

      const batchDuration = Date.now() - batchStart;
      processedItems += actualBatchSize;

      console.log(
        `${marketplace.name} batch ${batchIndex + 1}/${totalBatches}: ${actualBatchSize} items in ${batchDuration}ms (${processedItems}/${totalItems} total)`
      );

      const pauseTime = marketplace.name === "buff163" ? 200 : 100;
      await new Promise((res) => setTimeout(res, pauseTime));
    } catch (error) {
      console.error(
        `Batch ${batchIndex + 1}/${totalBatches} failed for ${marketplace.name}:`,
        error.message
      );
      failedBatches++;

      if (error.name === "AbortError") {
        console.warn(`Batch timeout for ${marketplace.name}, continuing...`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  console.log(
    `${marketplace.name} summary: ${successfulBatches}/${totalBatches} successful batches`
  );

  return {
    processedItems,
    successfulBatches,
    failedBatches,
    totalBatches,
  };
}

// ─── Main pipeline (runs in background via EdgeRuntime.waitUntil) ─────────────
async function runFullPipeline(supabase, runId) {
  const marketplaces = [
    { name: "steam", url: "https://prices.csgotrader.app/latest/steam.json" },
    { name: "csfloat", url: "https://prices.csgotrader.app/latest/csfloat.json" },
    { name: "skinport", url: "https://prices.csgotrader.app/latest/skinport.json" },
    { name: "buff163", url: "https://prices.csgotrader.app/latest/buff163.json" },
  ];

  const results = [];
  let totalUpdateSuccess = 0;

  // ── PHASE 1: Update all marketplaces ────────────────────────────────────────
  for (const marketplace of marketplaces) {
    const startTime = Date.now();
    try {
      console.log(`\n=== Processing ${marketplace.name.toUpperCase()} ===`);
      console.log(`Fetching ${marketplace.name} prices...`);

      const response = await fetch(marketplace.url, {
        headers: {
          "User-Agent": "InvestmentTracker/1.0",
          Accept: "application/json",
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

      const updateResult = await updateMarketplace(
        supabase,
        marketplace,
        priceData,
        runId
      );
      const duration = Date.now() - startTime;
      const success = updateResult.successfulBatches > 0;

      console.log(`${marketplace.name} completed in ${duration}ms`);

      if (success) totalUpdateSuccess++;

      results.push({
        marketplace: marketplace.name,
        success,
        duration,
        items_fetched: fetchedItems,
        items_processed: updateResult.processedItems,
        successful_batches: updateResult.successfulBatches,
        failed_batches: updateResult.failedBatches,
        total_batches: updateResult.totalBatches,
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
        total_batches: 1,
      });
    }
  }

  // ── PHASE 2: Cleanup stale prices ───────────────────────────────────────────
  console.log(`\n=== CLEANUP PHASE ===`);
  console.log(`Running cleanup for run_id: ${runId}`);

  let cleanupSuccess = false;
  let totalActiveItems = 0;
  let totalDeactivated = 0;

  if (totalUpdateSuccess > 0) {
    try {
      const { data: cleanupData, error: cleanupError } = await supabase.rpc(
        "cleanup_old_market_prices",
        { p_run_id: runId }
      );

      if (cleanupError) {
        console.error("Cleanup failed:", cleanupError);
      } else {
        cleanupSuccess = true;
        totalDeactivated = cleanupData?.total_deactivated || 0;
        console.log(`Cleanup successful: ${totalDeactivated} old items deactivated`);

        const { data: countData, error: countError } = await supabase
          .from("market_prices")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true);

        if (!countError) {
          totalActiveItems = countData || 0;
        }
      }
    } catch (error) {
      console.error("Fatal cleanup error:", error);
    }
  } else {
    console.warn("Skipping cleanup - no successful marketplace updates");
  }

  // ── PHASE 3: Portfolio snapshots ─────────────────────────────────────────────
  console.log(`\n=== SNAPSHOT PHASE ===`);
  let snapshotResults = [];

  if (cleanupSuccess) {
    try {
      const { data: activeUsers, error: usersError } = await supabase
        .from("investment_summary")
        .select("user_id")
        .gt("quantity", 0);

      if (usersError) throw usersError;

      const uniqueUserIds = [...new Set(activeUsers.map((r) => r.user_id))];
      console.log(`Taking snapshots for ${uniqueUserIds.length} active users...`);

      for (const userId of uniqueUserIds) {
        const { data, error } = await supabase.rpc("create_portfolio_snapshot", {
          context_user_id: userId,
          p_snapshot_date: new Date().toISOString(),
          p_granularity: "hourly",
        });

        if (error) {
          console.error(`Snapshot failed for user ${userId}:`, error.message);
          snapshotResults.push({ user_id: userId, success: false, error: error.message });
        } else {
          snapshotResults.push({ user_id: userId, success: true });
        }
      }

      console.log(
        `Snapshots complete: ${snapshotResults.filter((r) => r.success).length}/${uniqueUserIds.length} successful`
      );
    } catch (error) {
      console.error("Fatal snapshot error:", error);
    }
  } else {
    console.warn("Skipping snapshots - cleanup did not succeed");
  }

  // ── FINAL SUMMARY ────────────────────────────────────────────────────────────
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  console.log(`\n=== FINAL SUMMARY ===`);
  console.log(
    `${totalUpdateSuccess}/${results.length} marketplaces successful, ` +
    `${totalActiveItems} total active items, ` +
    `${totalDeactivated} deactivated, ` +
    `${snapshotResults.filter((r) => r.success).length} snapshots taken, ` +
    `${totalDuration}ms total duration`
  );
}

// ─── Request handler ──────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const runId = generateUUID();
    console.log(`Starting market price update with run_id: ${runId}`);

    // Return 202 immediately so pg_cron doesn't timeout waiting for a response.
    // The full pipeline continues running in the background.
    EdgeRuntime.waitUntil(runFullPipeline(supabase, runId));

    return new Response(
      JSON.stringify({
        success: true,
        message: "Market price update started",
        run_id: runId,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 202,
      }
    );
  } catch (error) {
    console.error("Fatal error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});