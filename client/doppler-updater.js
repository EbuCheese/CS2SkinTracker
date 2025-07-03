import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to detect Doppler phase from image URL
function detectDopplerPhase(imageUrl) {
    const url = imageUrl.toLowerCase();
   
    // Phase detection patterns - order matters (most specific first)
    const phasePatterns = {
        'blackpearl': 'Black Pearl',
        'phase1': 'Phase 1',
        'phase2': 'Phase 2',
        'phase3': 'Phase 3',
        'phase4': 'Phase 4',
        'ruby': 'Ruby',
        'sapphire': 'Sapphire',
        'emerald': 'Emerald'
    };
   
    // Check for each phase pattern in the URL
    for (const [pattern, phaseName] of Object.entries(phasePatterns)) {
        if (url.includes(pattern)) {
            return phaseName;
        }
    }
   
    return null;
}

// Function to extract knife type and doppler variant from name
function extractKnifeAndDopplerType(skinName) {
    // Remove the star prefix
    const nameWithoutStar = skinName.replace(/★\s*/, '').trim();
    
    // Split by the pipe separator
    const parts = nameWithoutStar.split('|').map(part => part.trim());
    
    if (parts.length >= 2) {
        const knifeType = parts[0];
        const skinType = parts[1];
        
        // Check if it's a Gamma Doppler or regular Doppler
        if (skinType.toLowerCase().includes('gamma doppler')) {
            return { knifeType, dopplerType: 'Gamma Doppler' };
        } else if (skinType.toLowerCase().includes('doppler')) {
            return { knifeType, dopplerType: 'Doppler' };
        }
    }
    
    // Fallback - shouldn't happen if the name is properly formatted
    return { knifeType: nameWithoutStar, dopplerType: 'Doppler' };
}

// Function to update Doppler knife names
function updateDopplerNames(skinsData) {
    let updatedCount = 0;
    let dopplerCount = 0;
   
    console.log(`Total skins in file: ${skinsData.length}`);
   
    skinsData.forEach((skin, index) => {
        // Check if it's a Doppler knife - be more flexible with detection
        const isDoppler = (skin.pattern && skin.pattern.toLowerCase().includes('doppler')) || 
                         (skin.name && skin.name.toLowerCase().includes('doppler'));
        
        if (isDoppler) {
            dopplerCount++;
            console.log(`\nFound Doppler #${dopplerCount}:`);
            console.log(`  Name: ${skin.name}`);
            console.log(`  Pattern: ${skin.pattern}`);
            console.log(`  Image: ${skin.image}`);
           
            const phase = detectDopplerPhase(skin.image);
            console.log(`  Detected phase: ${phase || 'None'}`);
           
            if (phase) {
                const { knifeType, dopplerType } = extractKnifeAndDopplerType(skin.name);
                const newName = `★ ${knifeType} | ${dopplerType} (${phase})`;
               
                console.log(`  ✅ Updating: "${skin.name}" -> "${newName}"`);
                skin.name = newName;
                updatedCount++;
            } else {
                console.log(`  ❌ No phase detected in URL`);
                // Let's see what the URL looks like for debugging
                console.log(`  URL for debugging: ${skin.image}`);
            }
        }
    });
   
    console.log(`\nSummary:`);
    console.log(`- Total Doppler knives found: ${dopplerCount}`);
    console.log(`- Updated with phase info: ${updatedCount}`);
   
    return updatedCount;
}

// Main function
function processSkins(inputFile, outputFile = null) {
    try {
        // Resolve the input file path
        const resolvedInputFile = path.resolve(inputFile);
        
        // Check if file exists
        if (!fs.existsSync(resolvedInputFile)) {
            throw new Error(`File "${resolvedInputFile}" not found!`);
        }

        // Read the JSON file
        console.log(`Reading ${resolvedInputFile}...`);
        const data = fs.readFileSync(resolvedInputFile, 'utf8');
        const skinsData = JSON.parse(data);
       
        // Update Doppler names
        console.log('Processing Doppler knives...');
        const updatedCount = updateDopplerNames(skinsData);
       
        // Write back to file
        const output = outputFile ? path.resolve(outputFile) : resolvedInputFile;
        console.log(`Writing updated data to ${output}...`);
        fs.writeFileSync(output, JSON.stringify(skinsData, null, 4));
       
        console.log(`✅ Successfully updated ${updatedCount} Doppler knives!`);
       
    } catch (error) {
        console.error('❌ Error processing file:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// More reliable main module detection
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
    const inputFile = process.argv[2] || path.join(__dirname, 'public', 'data', 'skins.json');
    const outputFile = process.argv[3]; // Optional output file
   
    console.log(`Script directory: ${__dirname}`);
    console.log(`Input file: ${inputFile}`);
    
    processSkins(inputFile, outputFile);
}

// Export for use as module
export { processSkins, updateDopplerNames, detectDopplerPhase };