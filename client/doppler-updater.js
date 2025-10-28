import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to extract knife type and doppler variant from name
function extractKnifeAndDopplerType(skinName) {
    const nameWithoutStar = skinName.replace(/★\s*/, '').trim();
    const parts = nameWithoutStar.split('|').map(part => part.trim());
    
    if (parts.length >= 2) {
        const knifeType = parts[0];
        const skinType = parts[1];
        
        if (skinType.toLowerCase().includes('gamma doppler')) {
            return { knifeType, dopplerType: 'Gamma Doppler' };
        } else if (skinType.toLowerCase().includes('doppler')) {
            return { knifeType, dopplerType: 'Doppler' };
        }
    }
    
    return { knifeType: nameWithoutStar, dopplerType: 'Doppler' };
}

// Update Doppler names with phase info
function updateDopplerNames(skinsData) {
    let updatedCount = 0;
    let dopplerCount = 0;
   
    skinsData.forEach((skin) => {
        const isDoppler = skin.pattern && skin.pattern.toLowerCase().includes('doppler');
        
        if (isDoppler && skin.phase) {
            dopplerCount++;
            
            const { knifeType, dopplerType } = extractKnifeAndDopplerType(skin.name);
            const newName = `★ ${knifeType} | ${dopplerType} (${skin.phase})`;
           
            console.log(`  ✅ Updating: "${skin.name}" -> "${newName}"`);
            skin.name = newName;
            updatedCount++;
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
        const resolvedInputFile = path.resolve(inputFile);
        
        if (!fs.existsSync(resolvedInputFile)) {
            throw new Error(`File "${resolvedInputFile}" not found!`);
        }

        console.log(`Reading ${resolvedInputFile}...`);
        const data = fs.readFileSync(resolvedInputFile, 'utf8');
        const skinsData = JSON.parse(data);
       
        console.log('Processing Doppler knives...');
        const updatedCount = updateDopplerNames(skinsData);
       
        const output = outputFile ? path.resolve(outputFile) : resolvedInputFile;
        console.log(`Writing updated data to ${output}...`);
        fs.writeFileSync(output, JSON.stringify(skinsData, null, 4));
       
        console.log(`✅ Successfully updated ${updatedCount} Doppler knives!`);
       
    } catch (error) {
        console.error('❌ Error processing file:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
    const inputFile = process.argv[2] || path.join(__dirname, 'public', 'data', 'skins.json');
    const outputFile = process.argv[3];
   
    console.log(`Script directory: ${__dirname}`);
    console.log(`Input file: ${inputFile}`);
    
    processSkins(inputFile, outputFile);
}

export { processSkins, updateDopplerNames, extractKnifeAndDopplerType };