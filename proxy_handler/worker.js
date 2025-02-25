// proxy_handler/worker.js
import { parentPort } from "worker_threads";
import request from "request";
import log4js from "log4js";

// Configure log4js
log4js.configure({
  appenders: {
    file: { type: "file", filename: "worker.log" },
    console: { type: "console" }
  },
  categories: {
    default: { appenders: ["console", "file"], level: "info" }
  }
});

// Get the logger instance
const logger = log4js.getLogger();

const headers = {
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'accept-encoding': 'gzip, deflate, br, zstd',
  'accept-language': 'en-US,en;q=0.6',
  'cache-control': 'max-age=0',
  'priority': 'u=0, i',
  'sec-ch-ua': '"Not A(Brand";v="8", "Chromium";v="132", "Brave";v="132"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'same-origin',
  'sec-fetch-user': '?1',
  'sec-gpc': '1',
  'upgrade-insecure-requests': '1',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
};

const domains = [
  "https://app.gradient.network",
  "https://toggle.pro/sign-in",
  "https://openloop.so/auth/login",
  "https://bless.network",  // This will be skipped
  "https://app.blockmesh.xyz/",
  "https://app.despeed.net/",
  "https://app.depined.org/onboarding"
];

const services = {
  'https://app.gradient.network': 'gradient',
  'https://toggle.pro/sign-in': 'toggle',
  'https://openloop.so/auth/login': 'openloop',
  'https://bless.network': 'bless',
  'https://app.blockmesh.xyz/': 'blockmesh',
  "https://app.despeed.net/": 'despeed',
  "https://app.depined.org/onboarding": 'depined'
};

// Function to test a proxy against a list of domains
async function testProxy(proxyUrl, domains) {
  const results = {
    proxy: proxyUrl,
    success: [],
    fail: [],
  };

  for (let domain of domains) {
    if (domain === "https://bless.network" || domain === "https://app.blockmesh.xyz/" || domain === "https://app.depined.org/onboarding") {
      // Skip testing bless.network and add it directly to success
      results.success.push(services[domain]);
      logger.info(`Skipping ${domain}, automatically adding to success.`);
      continue;
    }

    const options = {
      url: domain,
      proxy: `http://${proxyUrl}`,
      timeout: 10000, // 10 seconds timeout
      headers: headers,
    };

    try {
      await new Promise((resolve, reject) => {
        request(options, (error, response) => {
          if (error || response.statusCode !== 200) {
            return reject(new Error(`Failed to access ${domain}`));
          }
          resolve(response);
        });
      });
      results.success.push(services[domain]);
      logger.info(`Proxy ${proxyUrl} successfully pinged ${domain}`);
    } catch (err) {
      results.fail.push(services[domain]);
      logger.error(`Proxy ${proxyUrl} failed to ping ${domain}: ${err.message}`);
    }
  }

  return results;
}

// Listen for messages from the parent thread
parentPort.on("message", async (data) => {
  logger.info("Worker started processing proxies...");
  const results = await Promise.all(
    data.proxies.map(async (proxy) => {
      return testProxy(proxy, domains);
    })
  );
  // Send the results back to the main thread
  logger.info("Worker completed proxy processing.");
  parentPort.postMessage(results);
});
