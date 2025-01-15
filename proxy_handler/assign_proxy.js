const fs = require('fs');
const path = require('path');
const log4js = require('log4js');

// Configure log4js
log4js.configure({
  appenders: {
    file: { type: 'file', filename: 'assign_proxy.log' },
    console: { type: 'console' }
  },
  categories: {
    default: { appenders: ['console', 'file'], level: 'info' }
  }
});

// Get the logger instance
const logger = log4js.getLogger();

// Import the proxy list from the filtered_proxy.js file
const proxyList = require('../config/filtered_proxy.json');

// Read accounts from a text file
function readAccountsFromFile(filePath) {
  const data = fs.readFileSync(filePath, 'utf8');
  const accounts = data.split('\n').map(line => {
    const [username, password] = line.split(':');
    return { username, password };
  });
  return accounts;
}

// Get service names from the success URLs
function getServiceNamesFromUrls(urls) {
  const services = {
    'https://app.gradient.network': 'gradient',
    'https://toggle.pro/sign-in': 'toggle',
    'https://openloop.so/auth/login': 'openloop'
  };

  // Return the names of the services for the URLs that are in the services map
  return urls
    .map(urlString => services[urlString])
    .filter(serviceName => serviceName);  // Filter out undefined services
}

// Assign proxies to accounts without reusing the same proxy
function assignProxiesToAccounts(accounts, proxies) {
  const assignedProxies = new Set(); // Track which proxies have already been assigned

  return accounts.map(account => {
    // Filter out proxies that have already been assigned
    const availableProxies = proxies.filter(proxy => !assignedProxies.has(proxy.proxy));

    // Get up to 5 proxies for this account (if available)
    const accountProxies = availableProxies.slice(0, 5).map(proxy => {
      const runServices = getServiceNamesFromUrls(proxy.success);
      assignedProxies.add(proxy.proxy); // Mark this proxy as assigned
      return {
        ...proxy,
        run: runServices  // Add the "run" field with the service names
      };
    });

    return {
      username: account.username,
      proxies: accountProxies
    };
  });
}

// Save the result to a JSON file
function saveAccountsWithProxiesToFile(filePath, accountsWithProxies) {
  fs.writeFileSync(filePath, JSON.stringify(accountsWithProxies, null, 2), 'utf8');
}

// Main function to process the accounts and proxies
async function processAccountsAndProxies(accountFilePath, outputFilePath) {
  try {
    logger.info('Starting to process accounts and proxies...');
    
    const accounts = readAccountsFromFile(accountFilePath);
    logger.info(`Loaded ${accounts.length} accounts from ${accountFilePath}`);
    
    const accountsWithProxies = assignProxiesToAccounts(accounts, proxyList);
    logger.info(`Assigned proxies to ${accountsWithProxies.length} accounts`);

    saveAccountsWithProxiesToFile(outputFilePath, accountsWithProxies);
    logger.info(`Accounts with proxies have been saved to ${outputFilePath}`);
  } catch (error) {
    logger.error(`Error during processing: ${error.message}`);
  }
}

module.exports = { processAccountsAndProxies };
