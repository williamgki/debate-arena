#!/usr/bin/env node
// Script to process Meteor debate PDFs and convert to JSON format

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const SOURCE_DIR = '/Users/williamgkirby/Documents/debate-arena/meteor-debates';
const OUTPUT_DIR = '/Users/williamgkirby/Documents/debate-arena/meteor-debates-json';

async function processSingleDebate(folderName) {
  const sourceFolder = path.join(SOURCE_DIR, folderName);
  const outputFolder = path.join(OUTPUT_DIR, folderName);
  
  console.log(`Processing ${folderName}...`);
  
  try {
    // Check if PDFs exist
    const files = await fs.readdir(sourceFolder);
    const pdfFiles = files.filter(f => f.endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
      console.log(`  ⚠️  No PDFs found in ${folderName}`);
      return { success: false, reason: 'no_pdfs' };
    }
    
    // Convert PDFs to images
    const tempDir = path.join(sourceFolder, 'temp');
    await fs.mkdir(tempDir, { recursive: true });
    
    const images = [];
    for (const pdfFile of pdfFiles) {
      const baseName = path.basename(pdfFile, '.pdf');
      const pdfPath = path.join(sourceFolder, pdfFile);
      const outputPattern = path.join(tempDir, baseName);
      
      try {
        execSync(`pdftoppm -png "${pdfPath}" "${outputPattern}"`, { stdio: 'pipe' });
        
        // Find generated images
        const tempFiles = await fs.readdir(tempDir);
        const imageFiles = tempFiles.filter(f => f.startsWith(baseName) && f.endsWith('.png'));
        images.push(...imageFiles.map(f => path.join(tempDir, f)));
      } catch (error) {
        console.log(`    ❌ Failed to convert ${pdfFile}: ${error.message}`);
      }
    }
    
    if (images.length === 0) {
      console.log(`    ❌ No images generated for ${folderName}`);
      return { success: false, reason: 'conversion_failed' };
    }
    
    // Create extraction report
    const extractionReport = {
      folderName,
      pdfFiles,
      imageFiles: images.map(img => path.basename(img)),
      processed: new Date().toISOString(),
      status: 'images_ready'
    };
    
    // Save extraction report
    await fs.writeFile(
      path.join(outputFolder, 'extraction-report.json'),
      JSON.stringify(extractionReport, null, 2)
    );
    
    console.log(`  ✅ Converted ${pdfFiles.length} PDFs to ${images.length} images`);
    return { success: true, images, report: extractionReport };
    
  } catch (error) {
    console.log(`    ❌ Error processing ${folderName}: ${error.message}`);
    return { success: false, reason: 'error', error: error.message };
  }
}

async function main() {
  console.log('🚀 Starting Meteor debate PDF processing...\n');
  
  const folders = await fs.readdir(SOURCE_DIR);
  const debateFolders = folders.filter(f => f.match(/^\d{3}_/)).sort();
  
  console.log(`Found ${debateFolders.length} debate folders to process\n`);
  
  const results = [];
  
  for (const folder of debateFolders) {
    const result = await processSingleDebate(folder);
    results.push({ folder, ...result });
    
    // Small delay to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Generate summary
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log('\n📊 Processing Summary:');
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  
  if (failed.length > 0) {
    console.log('\n❌ Failed folders:');
    failed.forEach(f => {
      console.log(`  ${f.folder}: ${f.reason}`);
    });
  }
  
  // Save processing summary
  await fs.writeFile(
    path.join(OUTPUT_DIR, 'processing-summary.json'),
    JSON.stringify({ successful: successful.length, failed: failed.length, results }, null, 2)
  );
  
  console.log('\n🎉 PDF to image conversion completed!');
  console.log('Next step: Process images to extract debate content');
}

if (require.main === module) {
  main().catch(console.error);
}