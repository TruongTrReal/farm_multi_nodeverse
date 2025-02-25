// openloop.js
import { By, until } from "selenium-webdriver";
import config from "./config.js";
import { waitForElement, clickElement, safeClick } from "./automationHelpers.js";
import log4js from "log4js";

class OpenloopService {
  constructor() {
    this.logger = log4js.getLogger('OpenloopService');
  }

  async login(driver, username, password, proxyUrl) {
    try {
      this.logger.info(`Starting OpenLoop login for ${username}`);
      const { loginUrl, extensionUrl, selectors } = config.services.openloop;
      
      await driver.get(loginUrl);
      await safeClick(driver, selectors.continueButton, 1000);
      
      // Locate username, password, and login button using CSS selectors.
      const usernameField = await driver.wait(
        until.elementLocated(By.css('.el-input-wrapper[type="email"] > .relative > input.el-input')),
        10000
      );
      const passwordField = await driver.wait(
        until.elementLocated(By.css('.el-input-wrapper[type="password"] > .relative > input.el-input')),
        10000
      );
      const loginButton = await driver.wait(
        until.elementLocated(By.css('.btn.btn-white.mt-3')),
        10000
      );
      
      await usernameField.sendKeys(username);
      await passwordField.sendKeys(password);
      await loginButton.click();
      
      await driver.sleep(3000);
      await driver.get(extensionUrl);
      await safeClick(driver, selectors.continueButton, 2000);
      await waitForElement(driver, selectors.loginConfirmElement, 20000);

      this.logger.info(`Login success for Openloop ${username}`);
      return true;
    } catch (error) {
      this.logger.error(`OpenLoop login error for ${username}: ${error.message}`);
      return false;
    }
  }

  async check(driver, username, proxyUrl) {
    try {
      await driver.get(config.services.openloop.extensionUrl);
      const { selectors } = config.services.openloop;
      await safeClick(driver, selectors.continueButton);
      
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

      const [status, quality, earnings] = await Promise.all([
        getValueSafe(selectors.status),
        getValueSafe(selectors.quality),
        getValueSafe(selectors.earnings)
      ]);

      this.logger.info(`OpenLoop status for ${username}:
      Status: ${status}
      Connection Quality: ${quality}
      Earnings: ${earnings}`);

      let point = parseInt(earnings, 10);
      if (isNaN(point)) {
        point = 0;
      }
      return point;

    } catch (error) {
      this.logger.error(`OpenLoop check failed for ${username}: ${error.message}`);
      return false;
    }
  }
}



export default new OpenloopService();
