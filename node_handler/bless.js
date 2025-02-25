// node_handler/bless.js
import { By, Key, until } from "selenium-webdriver";
import axios from "axios";
import { 
    waitForElement,
    checkElementExsist,
    clickElement, 
    safeClick, 
    enterText, 
    tabReset 
} from "./automationHelpers.js";
import config from "./config.js";
import log4js from "log4js";




// Utility function to pause execution for a specified amount of time.
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class BlessService {
    constructor() {
       this.logger = log4js.getLogger('BlessService');
       this.selectors = config.services.bless.selectors;
       this.bizSelectors = config.services.bizflycloud.selectors;
       this.veerSelectors = config.services.veer.selectors;
    }

    async getOtpBiz(driver, email, password) {
        let otp = null;
        try {
            await driver.switchTo().newWindow('tab');
            await driver.get(config.services.bizflycloud.loginUrl);

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

            await driver.sleep(1000);
            await clickElement(driver, this.bizSelectors.refreshButton);
            await driver.sleep(3000);
        
            await clickElement(driver, this.bizSelectors.firstMail);
        
            const emailContent = await driver.wait(
                until.elementLocated(By.xpath('//*[@id="app"]/div/div/div[3]/div/div[2]/h4')), // Replace with the correct selector for email content
                20000
            );
        
            const emailText = await emailContent.getText();
            const otpMatch = emailText.match(/\b\d{6}\b/); // Assuming the OTP is a 6-digit number
            if (otpMatch) {
                otp = otpMatch[0];
            }

            await driver.close();
            return otp;

        } catch (error) {
            this.logger.error('Error extracting OTP:', error);
        }
    }

  
    async getOtpVeer(driver, email, password) {
        let otp = null;
        try {
            await driver.switchTo().newWindow('tab');
            await driver.get("https://mail.veer.vn");

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
            }
            
            await driver.sleep(3000);
            await clickElement(driver, this.veerSelectors.refreshButton);
            await driver.sleep(3000);

            // Wait for the latest email and click it
            const latestEmail = await driver.wait(
            until.elementLocated(By.id('mail-item-0')), // Replace with appropriate selector for the latest email
            20000
            );
            await latestEmail.click();

            // Wait for the email content to load
            const emailContent = await driver.wait(
            until.elementLocated(By.xpath('//*[@id="mail-box-toggle"]/div[3]/div/div[2]/div/div[1]/h2')), // Replace with the correct selector for email content
            20000
            );

            // Extract the OTP from the email content
            const emailText = await emailContent.getText();
            const otpMatch = emailText.match(/\b\d{6}\b/); // Assuming the OTP is a 6-digit number
            if (otpMatch) {
            otp = otpMatch[0];
            }
            await driver.close();
            return otp;
        } catch (error) {
            console.error('Error extracting OTP:', error);
        }
    }
    
    async login(driver, username, password="Rtn@2024", proxyUrl) {
        try {
            // Go to the form page
            // console.log('Logging in Bless for ', username);
            await driver.get('https://bless.network/dashboard?ref=Y06FN1');

            await sleep(5000);

            // Wait for the email input field
            await driver.wait(until.elementLocated(By.xpath('//*[@id="email"]')), 20000);
            let emailInput = await driver.wait(until.elementLocated(By.xpath('//*[@id="email"]')), 20000);
            await emailInput.sendKeys(username);

            // Press 'Tab' and 'Enter' to submit the form
            await emailInput.sendKeys(Key.TAB, Key.RETURN);

            // Wait for OTP input window to pop up
            await sleep(45000);  // Allow 45 seconds for OTP to arrive

            // Call the API to get the OTP
            const domain = username.split('@')[1];
            let otp = '';
            let attempts = 0;

            while (attempts < 5) { 

                // Determine the host based on the domain
                if (domain === 'veer.vn') {
                    otp = await this.getOtpVeer(driver, username, password);
                } else if (domain === 'tourzy.us' || domain === 'dealhot.vn') {
                    otp = await this.getOtpBiz(driver, username, password);
                } else {
                    throw new Error('Unsupported email domain');
                }

                if (otp !== null) {
                    break;
                }

                await sleep(30000);

                attempts++;
            }

            
            // If OTP is found, proceed to fill it in the OTP field
            if (otp !== null) {
                const handlesAfter = await driver.getAllWindowHandles();
                let otpHandle;

                for (const handle of handlesAfter) {
                    await driver.switchTo().window(handle);
                    const title = await driver.getTitle();
                    if (title.includes("Web3Auth Passwordless Login")) {
                        break;
                    }
                }

                // Wait for OTP input to appear and fill in the OTP
                await driver.wait(until.elementLocated(By.xpath('//*[@id="app"]/div/div/div/div/div[3]/div/form/input[1]')), 20000);
                let otpInput = await driver.wait(until.elementLocated(By.xpath('//*[@id="app"]/div/div/div/div/div[3]/div/form/input[1]')), 20000);
                await otpInput.sendKeys(otp);

                // Switch back to the main window
                await driver.switchTo().window(handlesAfter[0]);

                // Wait for the dashboard to load
                await driver.wait(until.elementLocated(By.xpath('/html/body/div/main/div/div[1]/h1')), 20000);

                this.logger.info(`Login Bless success for ${username}`);
                return true;
            } else {
                this.logger.error('OTP not found after many try.');
                return false;
            }

        } catch (err) {
            this.logger.error('Error in script execution:', err);
            return false;
        } 
    }

  // Check function for Bless.
  async check(driver, username, proxyUrl) {
    try {
        let token = null;
        let attempts = 0;

        while (attempts < 7) {    
            // Extract the token from localStorage
            token = await driver.executeScript('return window.localStorage.getItem("B7S_AUTH_TOKEN");');
    
            // Check if the token is found and not equal to 'ERROR'
            if (token && token !== 'ERROR') {
                break;  // Exit the loop when a valid token is found
            } else {
                this.logger.info('Token not found or is ERROR, retrying...');
            }

            await driver.sleep(5000);
    
            // Refresh the page and retry
            await driver.navigate().refresh();
            attempts++;
        }

        if (attempts === 7) {
            // console.log('Token not found after 7 attempts.');
            throw new Error('Token not found after 100 attempts');
        }

        const pubKey = await this.getPubKeyFromToken(token);

        const totalReward = await this.getReward(token, pubKey);
        
        this.logger.info(`Got Bless reward: ${totalReward}`);
        return totalReward;
        // code to check reward here
    } catch (error) {
        this.logger.error(`Bless check failed for ${username}: ${error.message}`);
        return false;
    }
  }

  async getPubKeyFromToken(token) {
    const maxRetries = 5;  // Set maximum number of retries
    const retryDelay = 10000;  // Set retry delay in milliseconds (10 seconds)
  
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {  
        // Make the GET request to retrieve the nodes using the provided token
        const response = await axios.get('https://gateway-run.bls.dev/api/v1/nodes', {
          headers: {
            'accept': '*/*',
            'accept-language': 'en-US,en;q=0.9',
            'authorization': `Bearer ${token}`,
            'content-type': 'application/json',
            'origin': 'https://bless.network',
            'priority': 'u=1, i',
            'referer': 'https://bless.network/',
            'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'cross-site',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
          }
        });
  
        // Check if the response data is an array and contains at least one node
        if (Array.isArray(response.data) && response.data.length > 0) {
          const node = response.data[0];  // Select the first node
          const pubKey = node.pubKey;  // Extract the pubKey from the node
          return pubKey;  // Return the pubKey
        } else {
          throw new Error('No nodes found in the response.');
        }
      } catch (error) {
        this.logger.error(`Error fetching pubKey on attempt ${attempt}:`, error.message);
  
        // If it's the last attempt, throw the error
        if (attempt === maxRetries) {
            this.logger.error('Max retries reached, unable to fetch pubKey.');
          throw new Error('Unable to fetch pubKey after multiple attempts');
        }
  
        // Wait for the specified delay before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  async getReward(token, pubkey) {
    try {
      const response = await axios.get('https://gateway-run.bls.dev/api/v1/nodes', {
        headers: {
          'accept': '*/*',
          'accept-language': 'en-US,en;q=0.9',
          'authorization': `Bearer ${token}`,
          'content-type': 'application/json',
          'origin': 'https://bless.network',
          'priority': 'u=1, i',
          'referer': 'https://bless.network/',
          'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'cross-site',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        }
      });
  
      // Ensure the response data is an array
      if (Array.isArray(response.data)) {
        // Find the node with the matching pubKey
        const node = response.data.find(item => item.pubKey === pubkey);
        if (node) {
          return node.totalReward;
        } else {
          throw new Error('No node found with the provided public key');
        }
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (error) {
      this.logger.error('Error fetching reward:', error.message);
      throw error;
    }
  }  
  
}

export default new BlessService();
