// proxy_handler/main.js
import fs from "fs";
import { Worker } from "worker_threads";
import log4js from "log4js";

// 1) Bring in the DB initializer
import { initDB } from "../init_db.js";

// Configure log4js
log4js.configure({
  appenders: {
    file: { type: 'file', filename: 'process.log' },
    console: { type: 'console' }
  },
  categories: {
    default: { appenders: ['console', 'file'], level: 'info' }
  }
});

// Get the logger instance
const logger = log4js.getLogger();

// Adjust chunk size if needed
const PROXY_CHUNK_SIZE = 10;

// Function to create a worker and process a chunk of proxies
async function processWithWorker(proxies) {
  return new Promise((resolve, reject) => {
    const worker = new Worker("./proxy_handler/worker.js");

    worker.on("message", (results) => {
      logger.info("Worker finished processing a chunk.");
      resolve(results);
      worker.terminate();
    });

    worker.on("error", (error) => {
      logger.error(`Worker encountered an error: ${error.message}`);
      reject(error);
      worker.terminate();
    });

    worker.postMessage({ proxies });
  });
}

// Function to split proxies into chunks for workers
function chunkArray(arr, chunkSize) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }
  return chunks;
}

// Main function to process proxies and insert results into DB
async function processProxies(inputFile) {
  try {
    logger.info("Starting proxy processing...");

    // 1) Read and clean the list of proxies from the text file
    const proxyList = fs.readFileSync(inputFile, "utf-8")
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean); // remove empty lines
    logger.info(`Loaded ${proxyList.length} proxies from ${inputFile}`);

    // 2) Split proxies into chunks
    const proxyChunks = chunkArray(proxyList, PROXY_CHUNK_SIZE);
    logger.info(`Splitting proxies into ${proxyChunks.length} chunks`);

    // 3) Create workers to process chunks
    const workerPromises = proxyChunks.map((chunk, index) => {
      logger.info(`Processing chunk ${index + 1} of ${proxyChunks.length}`);
      return processWithWorker(chunk);
    });

    // 4) Wait for all workers to complete
    const allResults = await Promise.all(workerPromises);
    logger.info("All workers have completed their tasks.");

    // 5) Flatten results from all workers
    const combinedResults = allResults.flat();

    // 6) Open DB connection
    const db = await initDB();

    // Optionally: clear out old rows if you want a fresh start
    await db.run("DELETE FROM filtered_proxies");

    // 7) Insert/Upsert each result into the database
    for (const result of combinedResults) {
      // result = { proxy: ..., success: [...], fail: [...] }
      const { proxy, success, fail } = result;

      // Convert success/fail arrays to JSON strings
      const successJson = JSON.stringify(success);
      const failJson = JSON.stringify(fail);

      // Example: INSERT OR REPLACE into the table
      // Adjust if you prefer INSERT OR IGNORE, etc.
      await db.run(
        `INSERT OR REPLACE INTO filtered_proxies (proxy, success, fail)
         VALUES (?, ?, ?)`,
        [proxy, successJson, failJson]
      );
    }

    await db.close();
    logger.info("All proxy results have been saved into the database.");
  } catch (error) {
    logger.error("Error processing proxies:", error);
  }
}

export { processProxies };


