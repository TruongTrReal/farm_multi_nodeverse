// proxy_handler/assign_proxy.js
import fs from "fs";
import path from "path";
import log4js from "log4js";
import { initDB } from "../init_db.js";

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

const logger = log4js.getLogger();


async function getFilteredProxiesFromDB(db) {
  const rows = await db.all('SELECT proxy, success, fail FROM filtered_proxies');
  return rows.map(row => ({
    proxy: row.proxy,
    success: JSON.parse(row.success || '[]'),
    fail: JSON.parse(row.fail || '[]')
  }));
}

function readAccountsFromFile(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .map(line => {
      const [username, ...passwordParts] = line.split(':');
      return { 
        username: username.trim(),
        password: passwordParts.join(':').trim() 
      };
    })
    .filter(acc => acc.username && acc.password);
}

async function saveAccountProxyMappings(db, accountsWithProxies) {
  for (const account of accountsWithProxies) {
    // Insert or ignore if account exsist
    await db.run(
      `INSERT OR IGNORE INTO accounts (username, password) VALUES (?, ?)`,
      [account.username, account.password]
    );
    
    // Get account ID
    const { id } = await db.get(
      'SELECT id FROM accounts WHERE username = ?',
      [account.username]
    );

    // Insert proxy associations
    for (const proxy of account.proxies) {
      await db.run(
        `INSERT OR IGNORE INTO accounts_proxies (account_id, proxy, services) 
         VALUES (?, ?, ?)`,
        [id, proxy.proxy, JSON.stringify(proxy.run)]
      );
    }
  }
}

function assignProxiesToAccounts(accounts, proxies, service_chosen) {
  // Create a working copy of the proxy list
  const availableProxies = [...proxies];
  
  return accounts.map(account => {
    // Take first 5 proxies from the available list (or empty array if <5 remain)
    const assignedProxies = availableProxies.splice(0, 5);

    return {
      username: account.username,
      password: account.password,
      proxies: assignedProxies.map(proxy => ({
        proxy: proxy.proxy,
        run: proxy.success.filter(service => 
          service_chosen.includes(service)
        ) // 
      }))
    };
  });
}

async function saveFailedProxies(proxies, outputDir = './output') {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const failedProxies = proxies
    .filter(p => p.fail.length > 0)
    .map(p => p.proxy);

  const filePath = path.join(outputDir, 'failed_proxies.txt');
  fs.writeFileSync(filePath, failedProxies.join('\n'), 'utf8');
  logger.info(`Total failed proxies saved: ${failedProxies.length}`);
}

async function processAccountsAndProxies(accountFilePath, outputDir = './output', service_chosen) {
  try {
    const db = await initDB();
    
    // Load data
    const proxyList = await getFilteredProxiesFromDB(db);
    const accounts = readAccountsFromFile(accountFilePath);
    
    // Assign proxies
    const accountsWithProxies = assignProxiesToAccounts(accounts, proxyList, service_chosen);
    
    // Save to database
    await saveAccountProxyMappings(db, accountsWithProxies);
    
    // Save failed proxies
    await saveFailedProxies(proxyList, outputDir);
    
    await db.close();
    logger.info('Proxy assignment completed successfully');
  } catch (error) {
    logger.error(`Processing failed: ${error.message}`);
  }
}

export { processAccountsAndProxies };






