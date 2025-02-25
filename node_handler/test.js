// node_handler/testVoltix.js
import { Builder } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";
import voltixService from "./voltix.js";
import { tabReset } from "./automationHelpers.js";


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async function testVoltixService() {
  // Set up Chrome with both the Voltix and Phantom wallet extensions.
  const options = new chrome.Options();
  options.addArguments('start-maximized');
  options.addArguments('--disable-blink-features=AutomationControlled');
  // Update the paths to your CRX files if necessary.
  options.addExtensions("./../crxs/voltix.crx");
  options.addExtensions("./../crxs/phantom.crx");

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

  await driver.sleep(10000);
  await tabReset(driver);

  try {
    console.log("Starting Voltix login automation...");

    // Use the provided 12-word recovery key for Phantom setup.
    const recoveryKeyArray = [
      "credit",
      "better",
      "tent",
      "idea",
      "pink",
      "canvas",
      "desk",
      "collect",
      "story",
      "report",
      "neutral",
      "trust"
    ];

    // Call the Voltix service login method.
    const result = await voltixService.login(driver, recoveryKeyArray, "dummy_proxy");
    const points = await voltixService.check(driver, "dummy_user", "dummy_proxy");
    
    if(result) {
      console.log("Voltix login automation completed successfully.");
      console.log(`Voltix point value: ${points}`);
    } else {
      console.log("Voltix login automation failed.");
    }
  } catch (error) {
    console.error("Test encountered an error:", error);
    await sleep(99999999);
  } finally {
    await sleep(99999999);
    console.log("Test complete.");
  }
})();
