// depined.js
import { By, until } from "selenium-webdriver";
import config from "./config.js";
import { waitForElement, clickElement, enterText } from "./automationHelpers.js";
import log4js from "log4js";


class DepinedService {
  constructor() {
    this.logger = log4js.getLogger('DepinedService');
  }

  async login(driver, username, password, proxyUrl) {
    try {
      this.logger.info(`Starting Depined login for ${username}`);
      const { loginUrl, extensionUrl, selectors } = config.services.depined;
      
      await driver.get(loginUrl);
      await enterText(driver, selectors.usernameInput, username);
      await enterText(driver, selectors.passwordInput, password);
      await clickElement(driver, selectors.loginButton)
      
      await driver.sleep(3000);
      await waitForElement(driver, selectors.loginConfirmDashboard, 10000);

      this.logger.info(`Login success for Depined ${username}`);
      return true;
    } catch (error) {
      this.logger.error(`Depined login error for ${username}: ${error.message}`);
      return false;
    }
  }

  async check(driver, username, proxyUrl) {
    try {
      await driver.get(config.services.depined.extensionUrl);
      const { selectors } = config.services.depined;

      await driver.sleep(2000);
      await clickElement(driver, selectors.connectButton);
      await driver.sleep(5000);
      
      // Helper to safely get element text.
      const getValueSafe = async (selector) => {
        try {
          const element = await waitForElement(driver, selector);
          return await element.getText();
        } catch (error) {
          this.logger.warn(`Element not found: ${selector}`);
          return 'N/A';
        }
      };

      const [pointV] = await Promise.all([
        getValueSafe(selectors.pointValue)
      ]);

      this.logger.info(`Depined status for ${username}:
      Point: ${pointV}`);

      let point = parseInt(pointV, 10);
      if (isNaN(point)) {
        point = 0;
      }
      return point;

    } catch (error) {
      this.logger.error(`Depined check failed for ${username}: ${error.message}`);
      return false;
    }
  }
}

export default new DepinedService();

