// data-processor.js - Optimized field extraction for CS search (ES Modules)
import fs from 'fs';
import https from 'https';

// Define which fields to extract for each endpoint type
const fieldMappings = {
  skins: (item) => ({
    id: item.id,
    name: item.name,
    image: item.image,
    weapon: item.weapon?.name || null,
    category: item.category?.name || null,
    rarity: item.rarity?.name || null,
    rarityColor: item.rarity?.color || null,
    pattern: item.pattern?.name || null,
    minFloat: item.min_float,
    maxFloat: item.max_float,
    stattrak: item.stattrak || false,
    souvenir: item.souvenir || false,
    collections: item.collections?.map(c => c.id) || [], 
    crates: item.crates?.map(c => c.id) || [] 
  }),
 
  cases: (item) => ({
    id: item.id,
    name: item.name,
    image: item.image,
    type: item.type || 'Case',
    contains: item.contains?.map(skin => skin.id) || [],
    containsRare: item.contains_rare?.map(skin => skin.id) || [] 
  }),
 
  stickers: (item) => ({
    id: item.id,
    name: item.name,
    image: item.image,
    type: item.type || null,
    rarity: item.rarity?.name || null,
    rarityColor: item.rarity?.color || null,
    tournament: item.tournament || null,
    collections: item.collections?.map(c => c.id) || [], 
    crates: item.crates?.map(c => c.id) || []
  }),
 
  agents: (item) => ({
    id: item.id,
    name: item.name,
    image: item.image,
    rarity: item.rarity?.name || null,
    rarityColor: item.rarity?.color || null,
    collections: item.collections?.map(c => c.id) || [],
  }),
 
  keychains: (item) => {
  const isHighlight = item.id.startsWith('highlight-');
  
  return {
    id: item.id,
    name: item.name,
    image: item.image,
    rarity: item.rarity?.name || null,
    rarityColor: item.rarity?.color || null,
    collections: item.collections?.map(c => c.id) || [],
    isHighlight: isHighlight,
    souvenir: isHighlight,
    // Will be enriched with description during preprocessing in CSDataContext
    highlightId: isHighlight ? item.id.replace('highlight-', '') : null
  };
},
 
  graffiti: (item) => ({
    id: item.id,
    name: item.name,
    image: item.image,
    rarity: item.rarity?.name || null,
    rarityColor: item.rarity?.color || null,
    crates: item.crates?.map(c => c.id) || []
  }),
   
  patches: (item) => ({
    id: item.id,
    name: item.name,
    image: item.image,
    rarity: item.rarity?.name || null,
    rarityColor: item.rarity?.color || null
  }),
  
  music_kits: (item) => ({
    id: item.id,
    name: item.name,
    image: item.image,
    rarity: item.rarity?.name || null,
    rarityColor: item.rarity?.color || null
  }),
  
  highlights: (item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    image: item.image,
    video: item.video,
    tournamentEvent: item.tournament_event,
    team0: item.team0,
    team1: item.team1,
    stage: item.stage,
    map: item.map,
    keychainId: `highlight-${item.id}`,
    souvenir: true
  }),
  
  collections: (item) => ({
    id: item.id,
    name: item.name,
    image: item.image,
    crates: item.crates?.map(c => c.id) || [],
    contains: item.contains?.map(skin => skin.id) || []
  })
};

async function fetchAndProcess(url, filename, type) {
  return new Promise((resolve, reject) => {
    console.log(`Fetching ${type} from ${url}...`);
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const items = JSON.parse(data);
          console.log(`Loaded ${items.length} ${type} items`);
          
          // Apply field mapping if available
          const fieldMapper = fieldMappings[type];
          const processed = fieldMapper 
            ? items.map(fieldMapper)
            : items; // Fallback to original if no mapping defined
          
          // Calculate size reduction
          const originalSize = data.length;
          const processedData = JSON.stringify(processed);
          const processedSize = processedData.length;
          const reduction = ((originalSize - processedSize) / originalSize * 100).toFixed(1);
          
          // Write to file
          fs.writeFileSync(`public/data/${filename}`, processedData);
          
          console.log(`✅ ${type}: ${items.length} items processed`);
          console.log(`   Original: ${(originalSize / 1024).toFixed(1)}KB`);
          console.log(`   Processed: ${(processedSize / 1024).toFixed(1)}KB`);
          console.log(`   Reduction: ${reduction}%\n`);
          
          resolve({
            type,
            original: items.length,
            processed: processed.length,
            originalSize,
            processedSize,
            reduction
          });
        } catch (error) {
          console.error(`❌ Failed to process ${type}:`, error.message);
          reject(error);
        }
      });
    }).on('error', (error) => {
      console.error(`❌ Failed to fetch ${type}:`, error.message);
      reject(error);
    });
  });
}

async function processAll() {
  // The endpoints you're using (updated URLs)
  const endpoints = {
    'skins.json': {
      url: 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json',
      type: 'skins'
    },
    'cases.json': {
      url: 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/crates.json',
      type: 'cases'
    },
    'stickers.json': {
      url: 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/stickers.json',
      type: 'stickers'
    },
    'agents.json': {
      url: 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/agents.json',
      type: 'agents'
    },
    'keychains.json': {
      url: 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/keychains.json',
      type: 'keychains'
    },
    'graffiti.json': {
      url: 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/graffiti.json',
      type: 'graffiti'
    },
    'patches.json': {
      url: 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/patches.json',
      type: 'patches'
    },
    'music_kits.json': { 
    url: 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/music_kits.json',
    type: 'music_kits'
    },
    'highlights.json': {
      url: 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/highlights.json',
      type: 'highlights'
    },
    'collections.json': {
      url: 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/collections.json',
      type: 'collections'
    }
  };

  // Create data directory if it doesn't exist
  if (!fs.existsSync('public/data')) {
    fs.mkdirSync('public/data', { recursive: true });
  }

  console.log('🚀 Starting CS:GO API data processing...\n');
  
  const results = [];
  let totalOriginalSize = 0;
  let totalProcessedSize = 0;

  for (const [filename, config] of Object.entries(endpoints)) {
    try {
      const result = await fetchAndProcess(config.url, filename, config.type);
      results.push(result);
      totalOriginalSize += result.originalSize;
      totalProcessedSize += result.processedSize;
    } catch (error) {
      console.error(`Failed to process ${filename}:`, error);
    }
  }

  // Summary
  console.log('📊 Processing Summary:');
  console.log('='.repeat(50));
  results.forEach(result => {
    console.log(`${result.type.padEnd(12)}: ${result.processed.toString().padStart(5)} items (${result.reduction}% reduction)`);
  });
  console.log('='.repeat(50));
  console.log(`Total original size: ${(totalOriginalSize / 1024).toFixed(1)}KB`);
  console.log(`Total processed size: ${(totalProcessedSize / 1024).toFixed(1)}KB`);
  console.log(`Overall reduction: ${((totalOriginalSize - totalProcessedSize) / totalOriginalSize * 100).toFixed(1)}%`);
  console.log('\n✅ All files processed successfully!');
  console.log('\n📝 Next steps:');
  console.log('1. Update your React component endpoints to use local files');
  console.log('2. Remove the CORS proxy logic');
  console.log('3. Update the data parsing to handle the new simplified structure');
}

// Allow running specific endpoints only
const args = process.argv.slice(2);
if (args.length > 0) {
  console.log(`Processing only: ${args.join(', ')}`);
  // Filter endpoints based on command line arguments
  // e.g., node data-processor.js skins cases
}

processAll().catch(console.error);