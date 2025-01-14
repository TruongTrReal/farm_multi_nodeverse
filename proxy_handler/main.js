const fs = require("fs");
const { Worker, isMainThread, parentPort } = require("worker_threads");

const inputFile = "./config/proxy.txt";
const outputFile = "./../config/filtered_proxy.json";

const PROXY_CHUNK_SIZE = 10;

// Function to create a worker and process a chunk of proxies
async function processWithWorker(proxies) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./node_handler/proxy_handler/worker.js');
    
    worker.on('message', (results) => {
      resolve(results);
      worker.terminate();
    });

    worker.on('error', (error) => {
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

// Main function to process proxies
async function processProxies() {
  try {
    const proxyList = fs.readFileSync(inputFile, "utf-8").split("\n").filter(Boolean); // Read and clean the list
    const proxyChunks = chunkArray(proxyList, PROXY_CHUNK_SIZE);

    // Create workers to process chunks of proxies
    const workerPromises = proxyChunks.map((chunk) => processWithWorker(chunk));

    // Wait for all workers to complete
    const allResults = await Promise.all(workerPromises);

    // Flatten results from all workers
    const combinedResults = allResults.flat();

    // Save the results to a file
    fs.writeFileSync(outputFile, JSON.stringify(combinedResults, null, 2), "utf-8");
    console.log(`Results saved to ${outputFile}`);
  } catch (error) {
    console.error("Error processing proxies:", error);
  }
}

module.exports = {processProxies};