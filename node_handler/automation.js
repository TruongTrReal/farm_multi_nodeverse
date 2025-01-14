const fs = require('fs');
const path = require('path');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const proxyChain = require("proxy-chain");
const TokenPlugin = require('./token_handler');  // Adjust path if needed

const tokenPlugin = new TokenPlugin();
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Path to the CRX file (replace with your actual file path)
const openloop_Extension_Path = path.resolve('./crxs/openloop.crx');
const gradient_Extension_Path = path.resolve('./crxs/gradient.crx');
const toggle_Extension_Path = path.resolve('./crxs/toggle.crx');

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36";

// Configure Chrome options to disable GPU, sandbox, and add the extension
let options = new chrome.Options();
options.addArguments(
  '--no-sandbox',
  '--disable-gpu',
  `--user-agent=${USER_AGENT}`,
  '--disable-web-security',
  '--ignore-certificate-errors',
  '--dns-prefetch-disable',
  '--enable-unsafe-swiftshader',
  '--headless', // Uncomment this line to run in headless mode
);

options.addExtensions(openloop_Extension_Path);
options.addExtensions(gradient_Extension_Path);
options.addExtensions(toggle_Extension_Path);

const gradient_extension_url = "chrome-extension://caacbgbklghmpodbdafajbgdnegacfmo/popup.html";
const openloop_extension_url = "chrome-extension://effapmdildnpkiaeghlkicpfflpiambm/dist/popup/index.html";
const toggle_extension_url = "chrome-extension://bnkekngmddejlfdeefjilpfdhomeomgb/index.html";

// Function to load account and proxy data from a JSON file
function loadAccountData(filePath) {
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);  // Parse JSON file
}

// switch tab by url, BUGS
// async function switchToTab(driver, url) {
//     // Get all window handles
//     const windowHandles = await driver.getAllWindowHandles();
    
//     // Loop through all open windows to check if any tab's URL matches the provided URL
//     for (let i = 0; i < windowHandles.length; i++) {
//       await driver.switchTo().window(windowHandles[i]);
      
//       // Check if the current tab's URL matches the provided URL
//       const currentUrl = await driver.getCurrentUrl();
//       if (currentUrl === url) {
//         console.log(`Switched to existing tab with URL: ${url}`);
        
//         // Log the page title after switching
//         const title = await driver.getTitle();
//         console.log(`Page title after switch: ${title}`);
//         return; // If the tab is found, exit the function
//       }
//     }
  
//     // If no tab with the specified URL was found, open a new tab and navigate to the URL
//     await driver.executeScript(`window.open('${url}', '_blank');`);
//     const newWindowHandles = await driver.getAllWindowHandles();
//     await driver.switchTo().window(newWindowHandles[newWindowHandles.length - 1]);  // Switch to the new tab
//     console.log(`Opened a new tab and switched to it.`);
  
//     // Log the page title after switching to the new tab
//     const title = await driver.getTitle();
//     console.log(`Page title after new tab open: ${title}`);
//   }

async function switchToTab(driver, index, url = 'about:blank') {
    // Get all window handles
    const windowHandles = await driver.getAllWindowHandles();
  
    // Check if the specified index exists
    if (index < windowHandles.length) {
      // If it exists, switch to that tab
      await driver.switchTo().window(windowHandles[index]);
      console.log(`Switched to existing tab at index ${index}`);
  
      // Log the page title after switching
      const title = await driver.getTitle();
      console.log(`Page title after switch: ${title}`);
    } else {
      // If it doesn't exist, create a new tab and navigate to the URL
      await driver.executeScript(`window.open('${url}', '_blank');`);
      const newWindowHandles = await driver.getAllWindowHandles();
      await driver.switchTo().window(newWindowHandles[newWindowHandles.length - 1]);  // Switch to the new tab
      console.log(`Opened a new tab and switched to it.`);
  
      // Log the page title after switching to the new tab
      const title = await driver.getTitle();
      console.log(`Page title after new tab open: ${title}`);
    }
  }
  

// Main automation process for account and proxy with dynamic tasks
async function runAutomationForAccountAndProxy(account, proxyUrl, tasks = []) {
  let driver;
  var isFirstLogin = true;
  let last2minValueGradient = 0;
  let last2minValueToggle = 0;
  proxyUrl = 'http://' + proxyUrl;
  const { username, password } = account;
  const newProxyUrl = await proxyChain.anonymizeProxy(proxyUrl);
  const proxyDetails = new URL(newProxyUrl);
  let driverOptions = options;
  try {
    driverOptions.addArguments(
      `--proxy-server=${proxyDetails.protocol}//${proxyDetails.hostname}:${proxyDetails.port}`
    );

    if (proxyDetails.username && proxyDetails.password) {
      driverOptions.addArguments(`--proxy-auth=${proxyDetails.username}:${proxyDetails.password}`);
    }

    driver = await new Builder().forBrowser('chrome').setChromeOptions(driverOptions).build();
    await driver.sleep(3000);
    // Get all window handles (tabs)
    const windowHandles = await driver.getAllWindowHandles();
    
    // Ensure there is more than one tab open
    if (windowHandles.length < 3) {
      // Switch to the new tab (second tab)
      await driver.executeScript(`window.open('', '_blank');`);
      await driver.executeScript(`window.open('', '_blank');`);
      console.log('make 3 dummy tab.');
    }

    // Initialize task execution
    if (tasks.includes('openloop')) {
        await switchToTab(driver, 0);
        await tokenPlugin.login_openloop(driver, username, password, proxyUrl, isFirstLogin);
    } 
    if (tasks.includes('gradient')) {
        await switchToTab(driver, 1);
        await tokenPlugin.login_gradient(driver, username, password, proxyUrl);
    } 
    if (tasks.includes('toggle')) {
        await switchToTab(driver, 2);
        await tokenPlugin.login_toggle(driver, username, password, proxyUrl);
    }

    // Token checking loop
    while (true) {
      try {
        if (tasks.includes('openloop')) {
          await switchToTab(driver, 0);
          await tokenPlugin.navigateToExtension(driver, openloop_extension_url);
          await tokenPlugin.check_openloop(driver, username, password, proxyUrl);
        }

        if (tasks.includes('gradient')) {
          await switchToTab(driver, 1);
          await tokenPlugin.navigateToExtension(driver, gradient_extension_url);
          await tokenPlugin.check_gradient(driver, username, proxyUrl, isFirstLogin, last2minValueGradient);
        }

        if (tasks.includes('toggle')) {
          await switchToTab(driver, 2);
          await tokenPlugin.navigateToExtension(driver, toggle_extension_url);
          await tokenPlugin.check_toggle(driver, username, proxyUrl, last2minValueToggle);
        }

        await driver.sleep(200000);  // Sleep for 20 seconds before checking again
        isFirstLogin = false;
      } catch (error) {
        console.log(`Error while farming tokens for ${username} using proxy ${proxyUrl}: ${error.message}`);
      }
    }

  } catch (error) {
    console.error(`Error initializing WebDriver or running automation for Account: ${username}, Proxy: ${proxyUrl}`, error);
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
}

class Farm {
    async run() {
        try {
          const jsonFilePath = './config/account_with_proxy.json';
          const accountsData = loadAccountData(jsonFilePath);
      
          // Create an array to hold the promises for all automation tasks
          const taskPromises = [];
      
          // Function to handle sleep
          const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      
          // Loop through accounts and proxies
          for (const account of accountsData) {
            const { username, proxies } = account;
      
            for (const proxyObject of proxies) {
              const { proxy, run } = proxyObject; // Extract 'run' from each proxy
      
              if (!Array.isArray(run)) {
                throw new Error(`'run' field is missing or incorrectly formatted for account: ${username} with proxy: ${proxy}`);
              }
      
              console.log(`Found services to run for account ${username} with proxy ${proxy}: ${run.join(', ')}`);
            
              // Create a promise for the task and add it to the taskPromises array
              const taskPromise = new Promise(async (resolve, reject) => {
                try {
                  // Run the automation for this account with the proxy and services
                  await runAutomationForAccountAndProxy(account, proxy, run);
                  resolve();  // Resolve when the task completes successfully
                } catch (err) {
                  reject(err);  // Reject if there is any error during the task
                }
              });
      
              taskPromises.push(taskPromise);
              await sleep(120000);
            }
          }
      
          // Wait for all tasks to complete concurrently
          await Promise.all(taskPromises);
      
          console.log("All automation tasks have completed.");
        } catch (err) {
          console.error('Error during the automation setup:', err);
        }
      }
          
}

// Export Farm
module.exports = Farm;