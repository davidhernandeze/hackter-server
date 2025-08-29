#!/usr/bin/env node

/**
 * Map Processor Script
 * 
 * This script processes a PNG image and converts it to pixel and vertex arrays.
 * It can be run independently from the main application.
 * 
 * Usage:
 *   node processMap.js [imagePath] [pixelScale] [outputDir]
 * 
 * Arguments:
 *   imagePath  - Path to the PNG image (default: src/assets/map.png)
 *   pixelScale - How much a pixel is worth in vertex coordinates (default: 10)
 *   outputDir  - Directory to save output files (default: src/assets)
 * 
 * Example:
 *   node processMap.js ./assets/map.png 20 ./output
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { processMapImage } from './utils/mapProcessor.js';

// Get the directory name using ES module pattern
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Map Processor Script');
  console.log('====================');

  // Get command line arguments
  const args = process.argv.slice(2);
  let imagePath = args[0] || './assets/hackter_map.png';
  const pixelScale = parseInt(args[1]) || 5;
  let outputDir = args[2] || './assets';

  // If the paths are not absolute, resolve them relative to the src directory
  if (!path.isAbsolute(imagePath)) {
    imagePath = path.resolve(__dirname, imagePath);
  }

  if (!path.isAbsolute(outputDir)) {
    outputDir = path.resolve(__dirname, outputDir);
  }

  console.log(`Image path: ${imagePath}`);
  console.log(`Pixel scale: ${pixelScale}`);
  console.log(`Output directory: ${outputDir}`);
  console.log('');

  try {
    const result = await processMapImage(imagePath, pixelScale, outputDir);

    console.log('');
    console.log('Processing completed successfully!');
    console.log(`Pixel map dimensions: ${result.pixelMap[0].length}x${result.pixelMap.length}`);
    console.log(`Generated ${result.vertices.length / 2} perimeter polygon vertices`);
    console.log('');
    console.log('Output files:');
    console.log(`- ${path.resolve(outputDir, 'pixelMap.json')}`);
    console.log(`- ${path.resolve(outputDir, 'vertices.json')}`);
  } catch (error) {
    console.error('Error processing map:');
    console.error(error);
    process.exit(1);
  }
}

// Run the main function
main();
