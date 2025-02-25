// node_handler/tokenHandler.js
import log4js from "log4js";
import config from "./config.js";
import { waitForElement } from "./automationHelpers.js";
import openloopService from "./openloop.js";
import gradientService from "./gradient.js";
import toggleService from "./toggle.js";
import blessService from "./bless.js";
import blockmeshService from "./bmesh.js";
import despeedService from "./despeed.js";
import depinedService from "./depined.js";



class TokenPlugin {
  constructor() {
    this.logger = log4js.getLogger('TokenPlugin');

    // Mapping service names to their respective instances
    this.services = {
      openloop: openloopService,
      gradient: gradientService,
      toggle: toggleService,
      bless: blessService,
      blockmesh: blockmeshService,
      despeed: despeedService,
      depined: depinedService,
    };
  }

  // Generic checkLoginState that uses the service's extension URL and login confirmation element
  async checkLoginState(driver, service) {
    try {
      const serviceConfig = config.services[service];
      if (!serviceConfig) {
        throw new Error(`Service ${service} not found in configuration`);
      }
      const { loginUrl, extensionUrl, selectors } = serviceConfig;
      this.logger.info(`Checking login state for ${service}`);
      await driver.get(extensionUrl);
      await driver.navigate().refresh();
      await driver.sleep(3000);
      await waitForElement(driver, selectors.loginConfirmElement, config.timeouts.loginCheck);
      this.logger.info(`${service} login confirmed`);
      return true;
    } catch (error) {
      this.logger.warn(`${service} appears logged out: ${error.message}`);
      return false;
    }
  }

  // Generic method to login to any service dynamically
  async login(driver, service, username, password, proxyUrl) {
    try {
      if (!this.services[service]) {
        throw new Error(`Login method not found for service: ${service}`);
      }
      this.logger.info(`Attempting login for ${service}`);
      return await this.services[service].login(driver, username, password, proxyUrl);
    } catch (error) {
      this.logger.error(`Error logging in to ${service}: ${error.message}`);
      return false;
    }
  }

  // Generic method to check service status dynamically
  async check(driver, service, username, proxyUrl) {
    try {
      if (!this.services[service]) {
        throw new Error(`Check method not found for service: ${service}`);
      }
      this.logger.info(`Checking service status for ${service}`);
      return await this.services[service].check(driver, username, proxyUrl);
    } catch (error) {
      this.logger.error(`Error checking ${service}: ${error.message}`);
      return false;
    }
  }
}

export default TokenPlugin;
