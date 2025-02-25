import log4js from "log4js";
import { By, WebDriver, WebElement } from "selenium-webdriver";

import MtmService from "./mtm.js";
import {
  waitForElement,
  clickElement,
  enterText,
  checkElementExsist,
  actionsClickElement,
} from "./automationHelpers.js";



class LayerEdgeService {
  constructor() {
    this.logger = log4js.getLogger("LayerEdgeService");
    this.seedPhrase = undefined;
  }

  /** @param {WebDriver} driver */
  async _isLoggedIn(driver) {
    return await driver.executeScript(() => {
      return localStorage["wagmi.recentConnectorId"] && !localStorage["wagmi.io.metamask.disconnected"];
    });
  }

  async check(driver, username, password, proxyUrl, seedPhrases) {
    await this.login(driver, username, password, proxyUrl, seedPhrases);
    return await driver.executeScript(() => {
      return document.querySelector('strong[class*="earning_total__"]').innerText;
    });
  }

  /** @param {WebDriver} driver  */
  async login(driver, username, password, proxyUrl, seedPhrases) {
    const metamaskService = MtmService;
    seedPhrases = seedPhrases || this.seedPhrase;
    await metamaskService.setupOldWallet(driver, seedPhrases.split(" "));
    await driver.get("https://dashboard.layeredge.io/");
    if (!(await this._isLoggedIn(driver))) {
      console.log("login");
      await clickElement(driver, By.css('button[class*="inviteModal_submitButton__"]:not(:disabled)'));
      await driver.sleep(500);
      await clickElement(driver, By.xpath('//div[text()="MetaMask" ]'));
      await driver.sleep(3000);
      await metamaskService.confirm_any(driver);
      await driver.sleep(3000);
      /** @type {WebElement} */
    }
    let element = await waitForElement(
      driver,
      By.xpath(
        '(//*[text()="Please enter your invite code to access the platform"] |  //*[contains(text(),"Lightnode")] )[1]'
      )
    );
    if ((await element.getText()).includes("Please enter your invite code to access the platform")) {
      await enterText(driver, By.xpath('//input[@placeholder="Enter your invite code"]'), "aSwVnVxy");
      await clickElement(driver, By.xpath('//button[contains(text(),"Continue")]'));
    }
    await driver.sleep(3000);
    if (await checkElementExsist(driver, By.xpath('//button[contains(text(),"Start Node")]'))) {
      console.log("start node  ");

      await driver.executeScript(() => {
        let element = document.querySelector('div[class*="earning_earning__"] button');
        if (element && element.textContent.includes("Start Node")) {
          element.click();
        }
      });
      await driver.sleep(1000);

      await driver.executeScript(() => {
        let element = document.querySelector('div[class*="earning_earning__"] button');
        if (element && element.textContent.includes("Start Node")) {
          element.click();
        }
      });

      await metamaskService.confirm_any(driver);
    }
    await driver.sleep(3000);

    if (await checkElementExsist(driver, By.xpath('//button//span[contains(text(),"Claim Reward")]'))) {
      console.log("claim reward ");
      try {
        await actionsClickElement(driver, By.xpath('//button//span[contains(text(),"Claim Reward")]'), 5000);

        await metamaskService.confirm_any(driver);
        if (
          await checkElementExsist(
            driver,
            By.xpath('//*[@id="modal-root"]//button//span[contains(text(),"Claim Reward")]')
          )
        ) {
          await actionsClickElement(
            driver,
            By.xpath('//*[@id="modal-root"]//button//span[contains(text(),"Claim Reward")]')
          );
          await metamaskService.confirm_any(driver);
          await waitForElement(driver, By.xpath('//*[@id="modal-root"]//button//span[contains(text(),"Claimed")]'));
          await actionsClickElement(driver, By.xpath("//body"));
        }
      } catch (e) {
        console.log("claim reward error", e);
      }
    }
  }
}

export default new LayerEdgeService();
