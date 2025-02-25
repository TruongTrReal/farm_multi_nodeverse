// automationHelpers2.js
import { By, until } from "selenium-webdriver";
import config from "./config.js";
import fs from "fs";

class AutomationHelpers {
  constructor(driver) {
    this.driver = driver;
  }

  async waitForElement(selector, timeout = config.timeouts.element) {
    try {
      return await this.driver.wait(until.elementLocated(selector), timeout);
    } catch (error) {
      throw new Error(`Element not found: ${selector} - ${error.message}`);
    }
  }

  async checkElementExists(selector, timeout = config.timeouts.element) {
    try {
      await this.driver.wait(until.elementLocated(selector), timeout);
      return true;
    } catch (error) {
      return false;
    }
  }

  async clickElement(selector) {
    const element = await this.waitForElement(selector);
    await element.click();
  }

  async safeClick(selector, timeout = 2000) {
    try {
      const element = await this.driver.wait(until.elementLocated(selector), timeout);
      await element.click();
      return true;
    } catch (error) {
      return false;
    }
  }

  async enterText(selector, text) {
    const element = await this.waitForElement(selector, 10000);
    await element.sendKeys(text);
  }

  async tabReset() {
    try {
      const handles = await this.driver.getAllWindowHandles();
      if (handles.length > 1) {
        for (let i = handles.length - 1; i > 0; i--) {
          await this.driver.switchTo().window(handles[i]);
          await this.driver.close();
        }
        await this.driver.switchTo().window(handles[0]);
      }
      await this.driver.get('about:blank');
    } catch (error) {
      console.error(`[TAB CLEANUP ERROR] ${error.message}`);
    }
  }

  async scrollToElement(selector) {
    const element = await this.waitForElement(selector);
    await this.driver.executeScript("arguments[0].scrollIntoView(true);", element);
  }

  async waitForElementToBeClickable(selector, timeout = config.timeouts.element) {
    try {
      const element = await this.waitForElement(selector, timeout);
      await this.driver.wait(until.elementIsVisible(element), timeout);
      await this.driver.wait(until.elementIsEnabled(element), timeout);
      return element;
    } catch (error) {
      throw new Error(`Element not clickable: ${selector} - ${error.message}`);
    }
  }

  async waitForElementToBeInvisible(selector, timeout = config.timeouts.element) {
    try {
      await this.driver.wait(until.elementLocated(selector), timeout);
      return await this.driver.wait(until.elementIsNotVisible(this.driver.findElement(selector)), timeout);
    } catch (error) {
      throw new Error(`Element did not become invisible: ${selector} - ${error.message}`);
    }
  }

  async getElementText(selector) {
    const element = await this.waitForElement(selector);
    return await element.getText();
  }

  async selectDropdownByValue(selector, value) {
    const element = await this.waitForElement(selector);
    const options = await element.findElements(By.tagName('option'));
    for (let option of options) {
      const optionValue = await option.getAttribute('value');
      if (optionValue === value) {
        await option.click();
        break;
      }
    }
  }

  async switchToNewWindow() {
    const originalWindow = await this.driver.getWindowHandle();
    const windows = await this.driver.getAllWindowHandles();
    for (let handle of windows) {
      if (handle !== originalWindow) {
        await this.driver.switchTo().window(handle);
        return;
      }
    }
    throw new Error('No new window found');
  }

  async closeAllOtherTabs() {
    const currentHandle = await this.driver.getWindowHandle();
    const handles = await this.driver.getAllWindowHandles();
    for (let handle of handles) {
      if (handle !== currentHandle) {
        await this.driver.switchTo().window(handle);
        await this.driver.close();
      }
    }
    await this.driver.switchTo().window(currentHandle);
  }

  async takeScreenshot(filepath) {
    const image = await this.driver.takeScreenshot();
    fs.writeFileSync(filepath, image, 'base64');
  }

  async clearAndEnterText(selector, text) {
    const element = await this.waitForElement(selector);
    await element.clear();
    await element.sendKeys(text);
  }

  async waitForUrlToContain(substring, timeout = config.timeouts.page) {
    try {
      await this.driver.wait(until.urlContains(substring), timeout);
    } catch (error) {
      throw new Error(`URL did not contain "${substring}" within ${timeout} ms - ${error.message}`);
    }
  }

  async getAttribute(selector, attribute) {
    const element = await this.waitForElement(selector);
    return await element.getAttribute(attribute);
  }

  async switchToIframe(selector, timeout = config.timeouts.element) {
    try {
      const iframe = await this.waitForElement(selector, timeout);
      await this.driver.switchTo().frame(iframe);
    } catch (error) {
      throw new Error(`Failed to switch to iframe: ${selector} - ${error.message}`);
    }
  }
}

export { AutomationHelpers };
