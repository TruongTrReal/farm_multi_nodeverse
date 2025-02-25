import { WebDriver, By, WebElement } from "selenium-webdriver";
import {
  clickElement,
  enterText,
  actionsClickElement,
  waitForElement,
  safeClick,
  checkElementExsist,
  tabReset,
} from "./automationHelpers.js";

import config from "./config.js";
import log4js from "log4js";

/**
 * @typedef {Object} EmailThread
 * @property {number[]} draft_ids - Array of draft message IDs.
 * @property {number} folder_id - ID of the folder where the thread is located.
 * @property {number[]} folder_ids - List of folder IDs associated with the thread.
 * @property {boolean} has_attachments - Indicates if any messages in the thread have attachments.
 * @property {number} id - Unique identifier for the thread.
 * @property {number} last_message_received_timestamp - Timestamp of the last received message.
 * @property {?number} last_message_sent_timestamp - Timestamp of the last sent message (null if not available).
 * @property {number} last_message_timestamp - Timestamp of the most recent message in the thread.
 * @property {number} message_count - Number of messages in the thread.
 * @property {number[]} message_ids - List of message IDs in the thread.
 * @property {number} old_folder_id - Previous folder ID of the thread.
 * @property {Participant[]} participants - List of participants involved in the thread.
 * @property {string} snippet - Short preview of the latest message.
 * @property {string} snippets - Another version of the short preview (potentially redundant).
 * @property {boolean} starred - Indicates if the thread is starred.
 * @property {string} status - Status of the thread (e.g., "sent").
 * @property {string} subject - Subject of the email thread.
 * @property {?any} tracking - Tracking information (null if not available).
 * @property {boolean} unread - Indicates if there are unread messages in the thread.
 */

/**
 * @typedef {Object} Participant
 * @property {string} email - Email address of the participant.
 * @property {string} name - Name of the participant.
 */

class HahaWallet {
  constructor() {
    this.logger = log4js.getLogger("HahaWallet");
    this.veerSelectors = config.services.veer.selectors;
    this.seedPhrase = "";
    this.bizSelectors = config.services.bizflycloud.selectors;
    this.waitMailDelay = 3 * 60 * 1000;
  }

  /** @param {WebDriver} driver  */
  async getOtpBiz(driver, email, password, emailFilter) {
    const baseWindow = await driver.getWindowHandle();
    await driver.switchTo().newWindow("tab");
    await driver.get(config.services.bizflycloud.loginUrl);
    try {
      console.log(await driver.getCurrentUrl());

      const isLogin = await checkElementExsist(driver, this.bizSelectors.inboxElement, 5000);

      if (!isLogin) {
        await enterText(driver, this.bizSelectors.emailInput, email);
        await driver.sleep(500);
        await clickElement(driver, this.bizSelectors.nextButton);
        await driver.sleep(5000);
        await enterText(driver, this.bizSelectors.passwordInput, password);
        await driver.sleep(500);
        await clickElement(driver, this.bizSelectors.loginButton);
        await waitForElement(driver, this.bizSelectors.inboxElement, 45000);
      }

      // logged in
      await driver.sleep(1000);
      await clickElement(driver, this.bizSelectors.refreshButton);
      await driver.sleep(3000);

      // await clickElement(driver, this.bizSelectors.firstMail);

      // const emails = await driver.executeScript(() => {
      //   const em = [];
      //   document.querySelectorAll(".threads__list > div.thread.").forEach((element) => {
      //     em.push({
      //       senderName: element.querySelector(".thread__content--sender").textContent,
      //       title: element.querySelector(".thread__content--quote span span").textContent,
      //       desc: element.querySelector(".thread__content--quote span.snippet").textContent,
      //       date: element.querySelector("p.date-icon span").textContent,
      //     });
      //   });
      //   console.log(em);

      //   return em;
      // });

      /** @type {EmailThread[]} */
      const emails = await driver.executeAsyncScript(() => {
        fetch("https://mail.bizflycloud.vn/api/threads?in=INBOX&limit=50&offset=0", {
          headers: {
            "x-auth-token": localStorage.webmailToken,
          },
          mode: "cors",
        })
          .then((res) => res.json())
          .then((data) => {
            arguments[arguments.length - 1](data);
          });
      });

      for (let i = 0; i < emails.length; i++) {
        const email = emails[i];
        if (
          (!emailFilter.subject || email.subject.includes(emailFilter.subject)) &&
          (!emailFilter.senderName || email.participants[0].name.includes(emailFilter.senderName)) &&
          (!emailFilter.senderEmail || email.participants[0].email.includes(emailFilter.senderEmail)) &&
          (!emailFilter.fromTime || email.last_message_timestamp > emailFilter.fromTime) &&
          (!emailFilter.unread || email.unread)
        ) {
          return email.snippets.match(/\b\d{6}\b/)[0];
        }
      }

      throw new Error("not find otp");
    } catch (error) {
      this.logger.error("Error extracting OTP:", error);
    } finally {
      await driver.close();

      await driver.switchTo().window(baseWindow);
    }
  }

  /** @param {WebDriver} driver  */
  async getOtpVeer(driver, email, password, filter) {
    let otp = null;
    const baseWindow = await driver.getWindowHandle();
    await driver.switchTo().newWindow("tab");
    await driver.get("https://mail.veer.vn");
    try {
      console.log(await driver.getCurrentUrl());
      const isLogin = await checkElementExsist(driver, this.veerSelectors.inboxElement, 5000);
      if (!isLogin) {
        // Wait for and enter the email
        await enterText(driver, this.veerSelectors.emailInput, email);
        await enterText(driver, this.veerSelectors.passwordInput, password);
        await driver.sleep(500);
        await clickElement(driver, this.veerSelectors.loginButton);
        await driver.sleep(500);
        await waitForElement(driver, this.veerSelectors.inboxElement);

        const emails = await driver.executeAsyncScript(() => {
          fetch("https://mail.veer.vn/api/search", {
            headers: {
              "content-type": "application/json",
              Cookie: document.cookie,
            },
            body: '{"fullConversation":1,"sortBy":"dateDesc","offset":0,"limit":50,"query":"inid:\\"2\\"","types":"conversation","recip":"0","needExp":1}',
            method: "POST",
            mode: "cors",
          })
            .then((res) => res.json())
            .then((data) => arguments[arguments.length - 1](data.values.c));
        });

        for (const email of emails) {
          if (
            (!filter.subject || email.su.includes(filter.subject)) &&
            (!filter.senderName || email.e[0].d.includes(filter.senderName)) &&
            (!filter.senderEmail || email.e[0].a.includes(filter.senderEmail)) &&
            (!filter.fromTime || email.d >= filter.fromTime) &&
            (!filter.unread || email.u)
          ) {
            return email.fr.match(/\b\d{6}\b/)[0];
          }
        }
      }
      await driver.sleep(3000);
      await clickElement(driver, this.veerSelectors.refreshButton);
      await driver.sleep(3000);
    } catch (error) {
      console.error("Error extracting OTP:", error);
    } finally {
      await driver.close();
      await driver.switchTo().window(baseWindow);
    }
  }

  async getVerifyCode(driver, username, password, fromTime) {
    let domain = username.split("@").pop(),
      otp = null;
    var filter = {
      senderEmail: "accounts@haha.me",
      subject: "Your HaHa verification code",
      unread: false,
      fromTime: 0,
    };
    const startAt = Date.now();
    while (Date.now() - startAt < this.waitMailDelay) {
      if (domain === "veer.vn") {
        otp = await this.getOtpVeer(driver, username, password, filter);
      } else if (domain === "tourzy.us" || domain === "dealhot.vn") {
        otp = await this.getOtpBiz(driver, username, password, filter);
      } else {
        throw new Error("Unsupported email domain");
      }

      if (otp) {
        console.log("OTP: " + otp);
        return otp;
      }

      await driver.sleep(5000);
    }
    if (otp == null) {
      throw new Error("GET OTP TIMEOUR ERR");
    }
  }

  async check(driver, username, password, proxyUrl) {
    await this.login();
    return await driver.executeAsyncScript(() => {
      chrome.storage.local.get("data", (data) => {
        arguments[arguments.length - 1](data.data.KarmaController.karma.point);
      });
    });
  }
  
  /** @param {WebDriver} driver  */
  async login(driver, username, password, proxyUrl) {
    let refcode = "ANONYMOUS-ROU5K5";
    let pincode = "12345678"; // min 8 length
    const self = this;
    async function passPincode() {
      await enterText(driver, By.css('input[placeholder="Your Pin Code"]'), pincode);
      await enterText(driver, By.css('input[placeholder="Confirm Pin Code"]'), pincode);
      await clickElement(driver, By.xpath('//button[text()="Continue" and not(@disabled)]'));
    }
    let fromTime = Date.now();
    async function enterAccount(params) {
      await enterText(driver, By.css('input[type="email"]'), username);
      await enterText(driver, By.css('input[type="password"]'), password);
      let fromTime = Date.now();
    }
    async function isLoggedIn() {
      const e = await waitForElement(
        driver,
        By.xpath('(//p[text()="Legacy Wallet"] | //button[text()="GET STARTED"])[1]')
      );
      return (await e.getText()) === "Legacy Wallet";
    }

    const processVerify = async () => {
      await driver.sleep(5000);
      // let code = await self.getVerifyCode(driver, username, password, fromTime);
      let code = await self.getVerifyCode(driver, username, password, 0);

      for (let i = 0; i < 6; i++) {
        /** @type {WebElement} */
        let inp = await waitForElement(driver, By.css("#otp-input-" + i));
        inp.sendKeys(code[i]);
      }

      await clickElement(driver, By.xpath('//button[text()="VERIFY"]'));
    };

    await driver.get("chrome-extension://andhndehpcjpmneneealacgnmealilal/home.html");
    await driver.sleep(2000);
    if (!(await isLoggedIn())) {
      await clickElement(driver, By.xpath('//button[text()="GET STARTED"]'));

      await enterAccount();

      await driver.executeScript(() => {
        document.querySelector('input[placeholder="Referral Code"]')
          ? null
          : document
              .querySelector(
                "#app-content > div > div.w-\\[450px\\].max-h-\\[600px\\].bg-white.text-black.dark\\:bg-dark.dark\\:text-white.rounded-lg.overflow-hidden.relative > div.flex.flex-col.p-10 > div.flex.flex-row.items-center.gap-2.cursor-pointer"
              )
              .click();
      });
      await driver.sleep(500);
      await enterText(driver, By.css('input[placeholder="Referral Code"]'), refcode);
      await clickElement(driver, By.xpath('//button[text()="CONTINUE" and not(@disabled)]'));

      let e = await waitForElement(
        driver,
        By.xpath('(//div[text()="User already exists"] | //*[@id="otp-input-0"])[1]')
      );

      if ((await e.getText()).includes("User already exists")) {
        await clickElement(driver, By.xpath('//button[span="Login"]'));

        await enterAccount();

        await clickElement(driver, By.xpath('//button[text()="CONTINUE" and not(@disabled)]'));
      } else {
        await processVerify();
        try {
          await actionsClickElement(driver, By.xpath('//button[text()="Skip"]'));
        } catch (e) {}
      }

      /** @type {WebElement} */
      let verfifychecke = await waitForElement(
        driver,
        By.xpath('(//button[text()="VERIFY"] | //input[@placeholder="Your Pin Code"])[1]')
      );
      if ((await verfifychecke.getText()).includes("VERIFY")) {
        await processVerify();
      }
      await passPincode();

      await clickElement(driver, By.xpath('//label[contains(text(),"I agree to HaHa")]//input'));
      // await clickElement(driver, By.xpath('//button[text()="Create a New Wallet" and not(@disabled)]'));
      await clickElement(driver, By.xpath('//button[text()="Import Existing Wallet" and not(@disabled)]'));
      let inputs = await driver.findElements(
        By.xpath('//input[@class="w-full bg-transparent border-none outline-none"]')
      );
      let sps = this.seedPhrase.trim().split(" ");
      for (let i = 0; i < 12; i++) {
        inputs[i].sendKeys(sps[i]);
      }

      await clickElement(driver, By.xpath('//button[text()="Continue" and not(@disabled)]'));
      await clickElement(driver, By.xpath('//button[text()="Start Using Wallet" and not(@disabled)]'));
      await driver.sleep(2000);
      await safeClick(driver, By.xpath('//button[text()="Skip for now" and not(@disabled)]'));
    }

    // on wallet logged in
    if (await checkElementExsist(driver, By.xpath('//div[contains(text(),"Click here to claim your daily karma!")]'))) {
      await clickElement(driver, By.xpath('//div[contains(text(),"Click here to claim your daily karma!")]'));

      await safeClick(driver, By.xpath('//button[text()="Claim"]'), 5000);
    }
  }
}



export default new HahaWallet();

// if (require.main === module) {
//   const { Builder } = require("selenium-webdriver");
//   const chrome = require("selenium-webdriver/chrome");

//   (async () => {
//     const options = new chrome.Options();
//     options.addArguments("start-maximized");
//     options.addArguments("--disable-blink-features=AutomationControlled");
//     options.addExtensions("././crxs/hahawallet.crx");
//     const driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();

//     await driver.sleep(10000);

//     await tabReset(driver);

//     try {
//       const service = new HahaWallet();
//       service.seedPhrase = "arena again fork couple morning busy shell isolate hurdle kit lawsuit whisper";
//       await service.login(driver, "bull1007@veer.vn", "Rtn@2024");
//     } catch (error) {
//       console.error("Test encountered an error:", error);
//       driver.sleep(99999999);
//     } finally {
//       driver.sleep(99999999);
//       console.log("Test success.");
//     }
//   })();
// }
