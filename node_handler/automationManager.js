// node_handler/automationManager.js
import fs from "fs";
import path from "path";
import os from "os";
import { Builder } from "selenium-webdriver";
import proxyChain from "proxy-chain";
import TokenPlugin from "./tokenHandler.js";
import { initDB } from "../init_db.js";
import {
  MAX_LOGIN_RETRIES,
  PROFILE_CLEANUP_ON_FAILURE,
  CHECK_INTERVAL,
  STAGGER_DELAY,
  EXTENSIONS,
  configureChromeOptions,
  FAILED_TASKS_PATH,
  logger
} from "./config.js";
import { tabReset } from "./automationHelpers.js";
import fetch from "node-fetch";





// Ensure output and profiles directories exist
['./output', './profiles'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

class AutomationManager {
  constructor() {
    this.tokenPlugin = new TokenPlugin();
    this.chromeOptions = configureChromeOptions();
    this.db = null;
  }

  async getDB() {
    if (!this.db) {
      this.db = await initDB();
    }
    return this.db;
  }

  async run() {
    try {
      const accounts = await this.loadAccountData();
      const taskPromises = [];

      for (const account of accounts) {
        for (const proxyConfig of account.proxies) {
          taskPromises.push(
            this.handleAccountProxyTask(account, proxyConfig)
              .catch(e => logger.error(`Task failed: ${e.message}`))
          );
          await this.sleep(STAGGER_DELAY);
        }
      }

      await Promise.all(taskPromises);
      logger.info('[SYSTEM] All automation tasks completed');

    } catch (error) {
      logger.error(`[SYSTEM ERROR] ${error.message}`);
    }
  }

  
  async safeTabReset(driver) {
    try {
      await tabReset(driver);
    } catch (error) {
      logger.warn(`[TAB RESET ERROR] Failed to reset tab: ${error.message}`);
    }
  }

  /**
   * Report a service’s point to the external API endpoint.
   * @param {object} account - The account object (includes username, etc.).
   * @param {string} service - The name of the service (e.g. "dawn", "bless").
   * @param {number} point - The point value returned by check function.
   * @param {string} proxy - The proxy string in use (e.g. "user:pass@host:port").
   */
  async reportServicePoint(account, service, point, proxy) {
    // Convert service name to uppercase for "type" as requested:
    const type = service.toUpperCase();

    // Build request body as shown in your example
    const requestBody = {
      secretKey: 'Nodeverse-report-tool',
      type: type,
      // If your "account.username" is an email, you can use it directly here.
      email: account.username,
      point: point,
      // Or something like: email: account.email, if your DB has an actual email field
      device: os.type(), // e.g. "Linux", "Windows_NT", etc.
      ip: {
        status: 'CONNECTED',
        proxy: proxy,
        point: point
      }
    };

    try {
      const response = await fetch('https://report.nodeverse.ai/api/report-node/update-point', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      const data = await response.json();

      if (response.ok) {
        logger.info(`[REPORT SUCCESS] ${service} -> ${point} for ${account.username}. API response: ${JSON.stringify(data)}`);
      } else {
        logger.error(`[REPORT FAILED] Status: ${response.status}, body: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      logger.error(`[REPORT ERROR] Could not report point for ${service}, account ${account.username}. Error: ${error.message}`);
    }
  }

  async handleAccountProxyTask(account, proxyConfig) {
    const { proxy, run: services } = proxyConfig;
    const profilePath = this.getProfilePath(account, proxy);
    let retryCounters = {};

    // Initialize per-service retry counters
    services.forEach(service => {
      retryCounters[service] = 0;
    });

    const wasProfileThere = fs.existsSync(profilePath);
    try {
      // Initialize tasks in the new table if not already created.
      await this.initializeTasks(account, proxy, services);
      // Get the list of pending tasks (i.e. not marked as "failed")
      let tasks = await this.getPendingTasks(account, proxy);

      // If there are no more pending tasks, quit the driver peacefully
      if (tasks.length === 0) {
        logger.info(`[PROFILE DONE] [handleAccountProxyTask] All tasks for ${account.username} on proxy ${proxy} have failed or completed. Not open this profile up.`);
        return; // Exit loop to prevent further execution
      }

      while (tasks.length > 0) {
        let driver;
        driver = await this.initializeDriver(profilePath, proxy);
        try {
          const newProfile = !wasProfileThere ||
            tasks.some(task => retryCounters[task] > 0);

          if (newProfile) {
            logger.info("Creating new profile at", profilePath);
            await this.markProfileExists(profilePath);
          } else {
            logger.info("Using existing profile at", profilePath);
          }

          await this.monitorServices(driver, account, proxy, tasks, retryCounters);

          // Refresh the pending tasks after a monitoring cycle
          tasks = await this.getPendingTasks(account, proxy);
          if (tasks.length === 0) break;
        } finally {
          await this.safeTabReset(driver);
        }
      }

    } catch (error) {
      logger.error(`[FATAL ERROR] ${account.username}: ${error.message}`);
      this.handleCleanup(profilePath, services);
    }
  }

  async shouldProcessBlessTask(account, currentProxy) {
    try {
      const db = await this.getDB();
      // Fetch the pending bless task with the smallest id for this account.
      const row = await db.get(
        `SELECT id, proxy FROM task_monitoring 
         WHERE account_id = ? AND service = 'bless' AND state = 'pending' 
         ORDER BY id ASC LIMIT 1`,
         [account.id]
      );
      // No pending bless task exists – process the current one.
      if (!row) {
        return true;
      }
      // If the pending bless task belongs to the current proxy, process it.
      // Otherwise, it means a previous bless task is still pending.
      if (row.proxy === currentProxy) {
        return true;
      }
      // A previous bless task is still pending – skip processing this one.
      return false;
    } catch (error) {
      logger.error(`[BLESS CHECK ERROR] ${error.message}`);
      // On error, default to processing the task to avoid accidental skipping.
      return true;
    }
  }

  async monitorServices(driver, account, proxy, tasks, retryCounters) {
    while (tasks.length > 0) {
      tasks = await this.getPendingTasks(account, proxy);

      if (tasks.length === 0) {
        logger.info(`[PROFILE DONE] [monitorServices] All tasks for ${account.username} on proxy ${proxy} have failed or completed. Closing driver.`);
        await this.safeTabReset(driver);
        return;
      }

      const checkResults = await this.checkServices(driver, account, proxy, tasks, retryCounters);
      const { shouldRetry, remainingTasks } = await this.processCheckResults(
        checkResults,
        tasks,
        retryCounters,
        account,
        proxy
      );

      tasks = remainingTasks;

      if (!shouldRetry) {
        await driver.get('about:blank');
        await this.sleep(CHECK_INTERVAL);
      } else {
        break;
      }
    }
  }

  async checkServices(driver, account, proxy, tasks, retryCounters) {
    let results = {};
    for (const service of tasks) {
      try {
        await this.safeTabReset(driver);

        // For the "bless" service, check if a previous bless task is pending.
        if (service === "bless") {
          const processBless = await this.shouldProcessBlessTask(account, proxy);
          if (!processBless) {
            logger.info(`[BLESS SKIP] A previous bless task is pending for ${account.username}. Skipping this bless task.`);
            // Optionally, set the result to null or handle it as you see fit,
            // ensuring that this task is not updated in the monitor table.
            results[service] = null;
            continue; // Skip processing for this service.
          }
        }

        // Process other services (or bless if allowed) as normal.
        let loginState = await this.safeServiceCheck(() => this.tokenPlugin.checkLoginState(driver, service));

        let loginSuccess = loginState;

        while (!loginSuccess && retryCounters[service] < MAX_LOGIN_RETRIES) {
          try {
            loginSuccess = await this.tokenPlugin.login(
              driver,
              service,
              account.username,
              account.password,
              proxy
            );
            if (!loginSuccess) {
              retryCounters[service]++;
              logger.warn(`[LOGIN RETRY] ${service} login failed for ${account.username}. Attempt ${retryCounters[service]}/${MAX_LOGIN_RETRIES}`);
            }
          } catch (error) {
            retryCounters[service]++;
            logger.error(`[LOGIN ERROR] ${service} login error: ${error.message}. Attempt ${retryCounters[service]}/${MAX_LOGIN_RETRIES}`);
          }
        }
        if (loginSuccess) {
          results[service] = await this.tokenPlugin.check(
            driver,
            service,
            account.username,
            proxy
          );
        } else {
          await this.safeTabReset(driver);
          results[service] = "login_failed";
        }
      } catch (error) {
        results[service] = false;
        logger.error(`[CHECK ERROR] ${service} check failed: ${error.message}`);
      }
    }
    return results;
  }


  async processCheckResults(results, tasks, retryCounters, account, proxy) {
    let shouldRetry = false;
    const remainingTasks = [...tasks];
  
    for (const service of tasks) {
      // Skip bless service when appropriate.
      if (service === "bless" && results[service] === null) {
        logger.info(`[BLESS SKIP] Skipping update for bless service for ${account.username}`);
        continue;
      }
  
      if (results[service] !== false && results[service] !== "login_failed") {
        // Successful check returns a point value.
        const point = results[service];
        await this.updateTaskState(account.id, proxy, service, "success", 0, point);
        await this.reportServicePoint(account, service, point, proxy);
        
      } else if (results[service] === "login_failed") {
        // Login failure: mark as failed only if max retries are reached.
        if (retryCounters[service] < MAX_LOGIN_RETRIES) {
          logger.warn(`[RETRY] ${service} login failed for ${account.username}. Attempt ${retryCounters[service]}/${MAX_LOGIN_RETRIES}`);
          await this.updateTaskState(account.id, proxy, service, "pending", 0, 0);
          shouldRetry = true;
        } else {
          logger.error(`[FAILURE] ${service} login failed after ${MAX_LOGIN_RETRIES} attempts`);
          await this.updateTaskState(account.id, proxy, service, "failed", 0, 0);
          
          this.logFailedTask(account.username, proxy, service);
          const index = remainingTasks.indexOf(service);
          if (index > -1) {
            remainingTasks.splice(index, 1);
          }
        }
      } else {
        // Check failure (login was successful but check returned false).
        logger.warn(`[CHECK FAILURE] ${service} check returned false for ${account.username}`);
        await this.updateTaskState(account.id, proxy, service, "pending", 0, 0);
        // Continue to retry check failures without marking them as failed.
        shouldRetry = true;
      }
    }
  
    return { shouldRetry, remainingTasks };
  }
  


  async performLoginWorkflow(driver, account, proxy, tasks) {
    const remainingTasks = [...tasks];
    
    for (const service of tasks) {
      try {
        const success = await this.tokenPlugin[`login_${service}`](
          driver,
          account.username,
          account.password,
          proxy
        );

        if (!success) {
          logger.error(`[LOGIN FAIL] ${service} login failed for ${account.username}`);
          remainingTasks.splice(remainingTasks.indexOf(service), 1);
        }
      } catch (error) {
        logger.error(`[LOGIN ERROR] ${service} login failed: ${error.message}`);
        remainingTasks.splice(remainingTasks.indexOf(service), 1);
      }
    }
    
    return remainingTasks;
  }

  // -- Helper Methods --

  getProfilePath(account, proxy) {
    const sanitized = `${account.username}_${proxy}`.replace(/[^a-zA-Z0-9]/g, '_');
    return path.resolve(`./profiles/${sanitized}`);
  }

  profileExists(profilePath) {
    return fs.existsSync(profilePath);
  }

  async markProfileExists(profilePath) {
    if (!this.profileExists(profilePath)) {
      fs.mkdirSync(profilePath, { recursive: true });
    }
  }

  async validateExtensions() {
    for (const [name, extConfig] of Object.entries(EXTENSIONS)) {
      try {
        await fs.promises.access(extConfig.path, fs.constants.R_OK);
        const buffer = await fs.promises.readFile(extConfig.path);
        extConfig.valid = buffer.slice(0, 4).toString() === 'Cr24';
        logger.info(`Extension ${name} ${extConfig.valid ? 'valid' : 'invalid'}`);
      } catch (error) {
        extConfig.valid = false;
        logger.error(`Extension ${name} check failed: ${error.message}`);
      }
    }
  }


  async initializeDriver(profilePath, proxyUrl, maxRetries = 3) {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        const db = await this.getDB();
        const proxyRecord = await db.get(
          'SELECT proxy, services FROM accounts_proxies WHERE proxy = ?',
          [proxyUrl]
        );
  
        const options = configureChromeOptions();
        const parsedProxy = await this.processProxy(proxyUrl);
  
        options.addArguments(`--user-data-dir=${profilePath}`);
        options.addArguments(`--proxy-server=${parsedProxy.url}`);

        options.addExtensions(EXTENSIONS.hcapchaSolver.path);
        logger.info(`Loaded extension: hcapchaSolver`);
  
        if (parsedProxy.auth) {
          options.addArguments(`--proxy-auth=${parsedProxy.auth}`);
        }
  
        await this.validateExtensions();
  
        const services = proxyRecord && proxyRecord.services ? JSON.parse(proxyRecord.services) : [];
        services.forEach(service => {
          const extConfig = EXTENSIONS[service];
          if (extConfig && extConfig.valid) {
            
            try {
              options.addExtensions(extConfig.path);
              logger.info(`Loaded extension: ${service}`);
            } catch (error) {
              logger.error(`Failed to load extension ${service}: ${error.message}`);
            }
          }
        });
  
        const driver = await new Builder()
          .forBrowser('chrome')
          .setChromeOptions(options)
          .build();
  
        await driver.sleep(5000);
        await tabReset(driver);
  
        logger.info(`[DRIVER SUCCESS] Driver initialized successfully for proxy ${proxyUrl}`);
        return driver;
  
      } catch (error) {
        retries++;
        logger.error(`[DRIVER ERROR] Failed to initialize driver for proxy ${proxyUrl}. Attempt ${retries}/${maxRetries}. Error: ${error.message}`);
        
        if (error.message.includes('ECONNRESET') && retries < maxRetries) {
          logger.warn(`[RETRYING] Retrying driver initialization due to ECONNRESET...`);
          await this.sleep(3000);
        } else if (retries === maxRetries) {
          throw new Error(`Failed to initialize driver after ${maxRetries} attempts for proxy ${proxyUrl}: ${error.message}`);
        }
      }
    }
  }
  
  async safeServiceCheck(serviceCheckFunc, retries = 3) {
    let attempts = 0;
    while (attempts < retries) {
      try {
        return await serviceCheckFunc();
      } catch (error) {
        attempts++;
        if (error.message.includes('ECONNRESET')) {
          logger.warn(`[SERVICE CHECK RETRY] ECONNRESET for service check. Attempt ${attempts}/${retries}`);
          await this.sleep(2000);
        } else {
          throw error; // Break out for other errors
        }
      }
    }
    throw new Error(`Service check failed after ${retries} attempts`);
  }
  

  async processProxy(proxyUrl, maxRetries = 3) {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        const anonymized = await proxyChain.anonymizeProxy(`http://${proxyUrl}`);
        const parsed = new URL(anonymized);
        logger.info(`[PROXY SUCCESS] Anonymized Proxy: ${anonymized}`);
        return {
          url: `${parsed.protocol}//${parsed.hostname}:${parsed.port}`,
          auth: parsed.username && parsed.password ? `${parsed.username}:${parsed.password}` : null,
        };
      } catch (error) {
        retries++;
        logger.error(`[PROXY ERROR] Failed to anonymize proxy ${proxyUrl}. Attempt ${retries}/${maxRetries}. Error: ${error.message}`);
        if (retries === maxRetries) throw new Error(`Failed to process proxy after ${maxRetries} attempts: ${proxyUrl}`);
        await this.sleep(2000); // Small delay before retrying
      }
    }
  }
  

  async cleanupDriver(driver) {
    try {
      if (driver) {
        await driver.quit();
      }
    } catch (error) {
      logger.error(`[CLEANUP ERROR] ${error.message}`);
    }
  }

  handleCleanup(profilePath, tasks) {
    if (PROFILE_CLEANUP_ON_FAILURE && tasks.length === 0) {
      try {
        fs.rmSync(profilePath, { recursive: true, force: true });
        logger.info(`[CLEANUP] Removed profile ${profilePath}`);
      } catch (error) {
        logger.error(`[PROFILE CLEANUP ERROR] ${error.message}`);
      }
    }
  }

  logFailedTask(username, proxy, task) {
    const entry = { username, proxy, task, timestamp: new Date().toISOString() };
    const data = fs.existsSync(FAILED_TASKS_PATH)
      ? JSON.parse(fs.readFileSync(FAILED_TASKS_PATH))
      : [];
    
    data.push(entry);
    fs.writeFileSync(FAILED_TASKS_PATH, JSON.stringify(data, null, 2));
  }

  // New method: initialize tasks in the task_monitoring table if they don't already exist.
  async initializeTasks(account, proxy, services) {
    try {
      const db = await this.getDB();
      for (const service of services) {
        const existing = await db.get(
          `SELECT id FROM task_monitoring WHERE account_id = ? AND proxy = ? AND service = ?`,
          [account.id, proxy, service]
        );
        if (!existing) {
          await db.run(
            `INSERT INTO task_monitoring (account_id, proxy, service, state, retry_count) VALUES (?, ?, ?, 'pending', 0)`,
            [account.id, proxy, service]
          );
          logger.info(`Initialized task for ${account.username} - proxy: ${proxy}, service: ${service}`);
        }
      }
    } catch (error) {
      logger.error(`Failed to initialize tasks for ${account.username} on proxy ${proxy}: ${error.message}`);
    }
  }

  // New method: retrieve pending tasks (i.e. tasks not marked as "failed") for the given account and proxy.
  async getPendingTasks(account, proxy) {
    try {
      const db = await this.getDB();
      const rows = await db.all(
        `SELECT service FROM task_monitoring WHERE account_id = ? AND proxy = ? AND state != 'failed'`,
        [account.id, proxy]
      );
      return rows.map(row => row.service);
    } catch (error) {
      logger.error(`Failed to fetch pending tasks for ${account.username} on proxy ${proxy}: ${error.message}`);
      return [];
    }
  }

  // New method: update the state and optionally increment the retry_count for a task in the task_monitoring table.
  async updateTaskState(accountId, proxy, service, state, retryIncrement = 0, point = 0) {
    try {
      const db = await this.getDB();
      await db.run(
        `UPDATE task_monitoring
         SET state = ?,
             retry_count = retry_count + ?,
             point = ?
         WHERE account_id = ? AND proxy = ? AND service = ?`,
        [state, retryIncrement, point, accountId, proxy, service]
      );
      logger.info(`Updated task state for account ${accountId} on proxy ${proxy}: ${service} -> ${state}, point: ${point}`);
    } catch (error) {
      logger.error(`Failed to update task state for account ${accountId} on proxy ${proxy}, service ${service}: ${error.message}`);
    }
  
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Modified loadAccountData to fetch account and proxy info from the existing table.
  async loadAccountData() {
    try {
      const db = await this.getDB();
      const accounts = await db.all(`
        SELECT a.id, a.username, a.password,
               json_group_array(json_object(
                 'proxy', ap.proxy,
                 'run', json(ap.services)
               )) AS proxies
        FROM accounts a
        LEFT JOIN accounts_proxies ap ON a.id = ap.account_id
        GROUP BY a.id
      `);

      return accounts.map(account => ({
        ...account,
        proxies: account.proxies
          ? JSON.parse(account.proxies)
              .map(p => {
                p.run = typeof p.run === 'string' ? JSON.parse(p.run) : p.run;
                return p;
              })
              .filter(p => Array.isArray(p.run) && p.run.length > 0)
          : []
      }));
    } catch (error) {
      logger.error(`Failed to load accounts from DB: ${error.message}`);
      return [];
    }
  }
}

export default AutomationManager;
