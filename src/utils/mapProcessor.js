import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { intToRGBA, Jimp } from 'jimp'

// Get the directory name using ES module pattern
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Processes a PNG image and converts it to pixel and vertex arrays
 * @param {string} imagePath - Path to the PNG image
 * @param {number} pixelScale - How much a pixel is worth in vertex coordinates (default: 10)
 * @param {string} outputDir - Directory to save output files (default: '../assets')
 * @returns {Promise<{pixelMap: number[][], vertices: number[]}>}
 */
async function processMapImage(imagePath = '../assets/map.png', pixelScale = 5, outputDir = '../assets') {
  try {
    // Resolve the absolute path to the image if it's not already absolute
    const absoluteImagePath = path.isAbsolute(imagePath) 
      ? imagePath 
      : path.resolve(__dirname, imagePath);
    console.log(`Processing image: ${absoluteImagePath}`);

    // Read the image using Jimp
    const image = await Jimp.read(absoluteImagePath);
    const { width, height } = image.bitmap;
    console.log(`Image dimensions: ${width}x${height}`);

    // Create a 2D array to store the pixel map (1 for solid, 0 for empty)
    const pixelMap = Array(height).fill().map(() => Array(width).fill(0));

    // Process each pixel
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Get pixel color (rgba)
        const pixelColor = intToRGBA(image.getPixelColor(x, y));

        // If pixel is not transparent (alpha > 0), mark as solid
        if (pixelColor.a > 0) {
          pixelMap[y][x] = 1;
        }
      }
    }

    // Generate vertices from the pixel map
    const vertices = generateVertices(pixelMap, pixelScale);

    // Save the results to files
    saveToFile('pixelMap.json', pixelMap, outputDir);
    saveToFile('vertices.json', vertices, outputDir);

    return { pixelMap, vertices };
  } catch (error) {
    console.error('Error processing map image:', error);
    throw error;
  }
}

/**
 * Generates vertices from a pixel map, creating a polygon that follows the perimeter
 * @param {number[][]} pixelMap - 2D array of pixels (1 for solid, 0 for empty)
 * @param {number} scale - How much a pixel is worth in vertex coordinates
 * @returns {number[]} - Array of vertices [x1, y1, x2, y2, ...] representing the perimeter
 */
function generateVertices(pixelMap, scale) {
  const vertices = [];
  const height = pixelMap.length;
  const width = pixelMap[0].length;

  // Ensure the pixel map is not empty
  if (height === 0 || width === 0) {
    return [];
  }

  // Verify that (0,0) is filled as assumed in the requirements
  if (pixelMap[0][0] !== 1) {
    console.warn("Warning: Pixel at (0,0) is not filled. Algorithm assumes (0,0) is filled.");
    return [];
  }

  // Define directions: right, down, left, up (clockwise order)
  const directions = [
    { dx: 1, dy: 0, name: 'right' },
    { dx: 0, dy: 1, name: 'down' },
    { dx: -1, dy: 0, name: 'left' },
    { dx: 0, dy: -1, name: 'up' }
  ];

  // Start at (0,0)
  let startX = 0;
  let startY = 0;

  // Add the starting vertex
  vertices.push(startX * scale, startY * scale);

  // Find the next direction to move from (0,0)
  // We'll check in order: right, down, left, up
  let nextDirection = -1;
  for (let i = 0; i < directions.length; i++) {
    const nx = startX + directions[i].dx;
    const ny = startY + directions[i].dy;
    if (nx >= 0 && nx < width && ny >= 0 && ny < height && pixelMap[ny][nx] === 1) {
      nextDirection = i;
      break;
    }
  }

  if (nextDirection === -1) {
    console.warn("Warning: No valid direction to move from (0,0)");
    return vertices; // Return just the starting point
  }

  let currentX = startX;
  let currentY = startY;
  let currentDirection = nextDirection;
  let lastDirection = -1;

  // Track vertices to avoid duplicates
  const addedVertices = new Set();
  const getVertexKey = (x, y) => `${x},${y}`;
  addedVertices.add(getVertexKey(startX, startY));

  // Continue until we return to the starting point
  let steps = 0;
  const maxSteps = width * height * 4; // Safety limit

  while (steps < maxSteps) {
    steps++;

    // Try to find the next direction to move
    // We prioritize turning right (clockwise) relative to our current direction
    let foundNextDirection = false;
    let directionChecks = 0;

    // Start with the direction to the right of our current direction (turn clockwise)
    let checkDirection = (currentDirection + 3) % 4;

    while (directionChecks < 4) {
      const nx = currentX + directions[checkDirection].dx;
      const ny = currentY + directions[checkDirection].dy;

      // Check if this direction is valid
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && pixelMap[ny][nx] === 1) {
        // We found a valid direction to move
        if (lastDirection !== checkDirection) {
          // Direction changed, add a vertex
          if (!addedVertices.has(getVertexKey(currentX, currentY))) {
            vertices.push(currentX * scale, currentY * scale);
            addedVertices.add(getVertexKey(currentX, currentY));
          }
        }

        // Move in this direction
        currentX = nx;
        currentY = ny;
        lastDirection = checkDirection;
        currentDirection = checkDirection;
        foundNextDirection = true;

        // If we're back at the starting point, we're done
        if (currentX === startX && currentY === startY) {
          return vertices;
        }

        break;
      }

      // Try the next direction (counter-clockwise)
      checkDirection = (checkDirection + 1) % 4;
      directionChecks++;
    }

    if (!foundNextDirection) {
      // If we can't move in any direction, add the current vertex and break
      if (!addedVertices.has(getVertexKey(currentX, currentY))) {
        vertices.push(currentX * scale, currentY * scale);
      }
      break;
    }
  }

  if (steps >= maxSteps) {
    console.warn("Warning: Maximum steps reached. The perimeter may not be complete.");
  }

  // Add the starting vertex again to close the loop if we didn't return to it
  if (currentX !== startX || currentY !== startY) {
    vertices.push(startX * scale, startY * scale);
  }

  return vertices;
}

/**
 * Saves data to a JSON file
 * @param {string} filename - Name of the file to save
 * @param {any} data - Data to save
 * @param {string} outputDir - Directory to save the file (default: '../assets')
 */
function saveToFile(filename, data, outputDir = '../assets') {
  // Resolve the output directory path if it's not already absolute
  const resolvedOutputDir = path.isAbsolute(outputDir)
    ? outputDir
    : path.resolve(__dirname, outputDir);

  // Ensure the output directory exists
  if (!fs.existsSync(resolvedOutputDir)) {
    fs.mkdirSync(resolvedOutputDir, { recursive: true });
  }

  const outputPath = path.resolve(resolvedOutputDir, filename);
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`Saved to ${outputPath}`);
}

/**
 * Command line interface for the map processor
 */
async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);
  const imagePath = args[0] || '../assets/map.png';
  const pixelScale = parseInt(args[1]) || 10;
  const outputDir = args[2] || '../assets';

  console.log(`Starting map processing with scale: ${pixelScale}`);
  console.log(`Output directory: ${outputDir}`);

  try {
    const result = await processMapImage(imagePath, pixelScale, outputDir);
    console.log('Map processing completed successfully');
    console.log(`Generated ${result.vertices.length / 4} polygon vertices`);
  } catch (error) {
    console.error('Map processing failed:', error);
    process.exit(1);
  }
}

// Run the main function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Export functions for use in other modules
export { processMapImage, generateVertices };
