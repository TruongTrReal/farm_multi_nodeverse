// toggle.js
import { By, until } from "selenium-webdriver";
import config from "./config.js";
import { waitForElement, clickElement, safeClick, enterText } from "./automationHelpers.js";
import log4js from "log4js";

class ToggleService {
  constructor() {
    this.logger = log4js.getLogger('ToggleService');
  }

  async login(driver, username, password, proxyUrl) {
    try {
      this.logger.info(`Starting Toggle login for ${username}`);
      const { loginUrl, extensionUrl, selectors } = config.services.toggle;
      await driver.get(loginUrl);
      
      // Check if already logged in by verifying the dashboard element.
      try {
        await waitForElement(driver, selectors.dashboardElement, 20000);
        this.logger.info(`Already loged in Toggle for ${username}`);
        return true;
      } catch (e) {
        // Not logged in; proceed with the login flow.
      }
      
      await enterText(driver, selectors.usernameInput, username);
      await enterText(driver, selectors.passwordInput, password);
      await clickElement(driver, selectors.loginButton);
      await driver.sleep(3000);
      await waitForElement(driver, selectors.dashboardElement, 20000);
      this.logger.info(`Toggle login success for ${username}`);
      return true;
    } catch (error) {
      this.logger.error(`Toggle login failed for ${username}: ${error.message}`);
      return false;
    }
  }

  async check(driver, username, proxyUrl) {
    try {
      await driver.get(config.services.toggle.loginUrl);
      await driver.sleep(2000);
      await driver.get(config.services.toggle.extensionUrl);
      await driver.sleep(3000);
      const { selectors } = config.services.toggle;
      
      const getValueSafe = async (selector) => {
        try {
          const element = await waitForElement(driver, selector);
          return await element.getText();
        } catch (error) {
          this.logger.warn(`Element not found: ${selector}`);
          return 'N/A';
        }
      };

      const [quality, epoch, uptime] = await Promise.all([
        getValueSafe(selectors.quality),
        getValueSafe(selectors.epoch),
        getValueSafe(selectors.uptime)
      ]);

      this.logger.info(`Toggle status for ${username}:
      Connection Quality: ${quality}
      Epoch Value: ${epoch}
      Uptime: ${uptime}`);

      let point = parseInt(epoch, 10);
      if (isNaN(point)) {
        point = 0;
      }
      return point;

    } catch (error) {
      this.logger.error(`Toggle check error for ${username}: ${error.message}`);
      return false;
    }
  }
}



export default new ToggleService();
