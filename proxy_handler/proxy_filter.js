// worker.js

const { parentPort } = require('worker_threads');
const request = require('request');

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36";
  
const domains = [
  "https://app.gradient.network",
  "https://toggle.pro/sign-in",
  "https://openloop.so/auth/login",
];

// Function to test a proxy against a list of domains
async function testProxy(proxyUrl, domains) {
  const results = {
    proxy: proxyUrl,
    success: [],
    fail: [],
  };

  for (let domain of domains) {
    const options = {
      url: domain,
      proxy: `http://${proxyUrl}`,
      timeout: 120000, // 120 seconds timeout
      headers: {
        "User-Agent": USER_AGENT,
      },
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
      results.success.push(domain);
      console.log(`Proxy ${proxyUrl} successfully pinged ${domain}`);
    } catch (e) {
      results.fail.push(domain);
      console.log(`Proxy ${proxyUrl} failed to ping ${domain}`);
    }
  }

  return results;
}

// Listen for messages from the parent thread
parentPort.on('message', async (data) => {
  const results = await Promise.all(
    data.proxies.map(async (proxy) => {
      const result = await testProxy(proxy, domains);
      if (result.success.length >= 2) {
        return result;
      }
      return null; // Don't include proxies with less than 2 successes
    })
  );
  // Send the results back to the main thread
  parentPort.postMessage(results.filter((result) => result !== null));
});
