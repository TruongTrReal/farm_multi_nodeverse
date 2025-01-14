// node_handler/openloop.js
const { By, until } = require('selenium-webdriver');

class TokenPlugin {

    async login_openloop(driver, username, password="Rtn@2024", proxyUrl, isFirstLogin) {

        const url = 'chrome-extension://effapmdildnpkiaeghlkicpfflpiambm/dist/popup/index.html';

        if (isFirstLogin) {
            console.log(`Account: ${username}, Proxy: ${proxyUrl}, it is first run, login URL will be opened automatically.`);
            await driver.get(url);
            await driver.wait(until.titleIs('OpenLoop'), 30000); // 30s timeout
            console.log(`Account: ${username}, Proxy: ${proxyUrl}, Page title: ${await driver.getTitle()}`);

            const continueButton = await driver.findElement(By.xpath('//*[@id="app"]/div/div/div[1]/div/div/a/button'));
            await continueButton.click();

        } else {
            await driver.get(url);
            await driver.wait(until.titleIs('OpenLoop'), 30000); // 30s timeout
            console.log(`Account: ${username}, Proxy: ${proxyUrl}, Page title: ${await driver.getTitle()}`);
        }

        await driver.sleep(1000);  // Sleep to ensure the login process is complete

        // Find the username and password input fields and the login button
        const usernameField = await driver.wait(until.elementLocated(By.css('.el-input-wrapper[type="email"] > .relative > input.el-input')), 30000);
        const passwordField = await driver.wait(until.elementLocated(By.css('.el-input-wrapper[type="password"] > .relative > input.el-input')), 30000);
        const loginButton = await driver.wait(until.elementLocated(By.css('.btn.btn-white.mt-3')), 30000);


        // Enter credentials and login
        await usernameField.sendKeys(username);
        await passwordField.sendKeys(password);
        await loginButton.click();
        await driver.sleep(10000);  // Sleep to ensure the login process is complete
    }

    async login_gradient(driver, username, password="Rtn@2024", proxyUrl) {
      const url = 'https://app.gradient.network/';

      await driver.get(url);
      
      await driver.wait(until.titleIs('Gradient Network Dashboard'), 30000); // 30s timeout
      console.log(`Account: ${username}, Proxy: ${proxyUrl}, Page title: ${await driver.getTitle()}`);

      // Find the username and password input fields and the login button
      const usernameField = await driver.findElement(By.xpath('/html/body/div[1]/div[2]/div/div/div/div[2]/div[1]/input'));
      const passwordField = await driver.findElement(By.xpath('/html/body/div[1]/div[2]/div/div/div/div[2]/div[2]/span/input'));
      const loginButton = await driver.findElement(By.xpath('/html/body/div[1]/div[2]/div/div/div/div[4]/button[1]'));

      // Enter credentials and login
      await usernameField.sendKeys(username);
      await passwordField.sendKeys(password);
      await loginButton.click();
      await driver.sleep(10000);  // Sleep to ensure the login process is complete
    }

    async login_toggle(driver, username, password="Rtn@2024", proxyUrl) {
        const url = 'https://toggle.pro/sign-in';
        await driver.get(url);
        await driver.wait(until.titleIs('Toggle Pro - Revolutionary AI that transforms digital workforce'), 60000); // 30s timeout
        console.log(`Account: ${username}, Proxy: ${proxyUrl}, Page title: ${await driver.getTitle()}`);

        // Find the username and password input fields and the login button
        const usernameField = await driver.findElement(By.xpath('/html/body/div/div[1]/div/div/div/div[5]/form/div[1]/div/input'));
        const passwordField = await driver.findElement(By.xpath('/html/body/div/div[1]/div/div/div/div[5]/form/div[2]/div/input'));
        const loginButton = await driver.findElement(By.xpath('/html/body/div/div[1]/div/div/div/div[5]/form/button/div'));

        // Enter credentials and login
        await usernameField.sendKeys(username);
        await passwordField.sendKeys(password);
        await loginButton.click();
        await driver.sleep(10000);
    }

    async navigateToExtension(driver, token_extension_url) {
        await driver.get(token_extension_url);
        await driver.sleep(3000);  // Wait for the extension to load
    }

    async check_openloop(driver, username, password="Rtn@2024", proxyUrl) {
        try {
            console.log(`Account: ${username}, Proxy: ${proxyUrl}, Refresh completed`);
            await driver.sleep(3000);

            // Check for the necessary elements (assuming the token expired or session expired)
            const statusValue = await driver.findElement(By.xpath('//*[@id="app"]/div/div/div[1]/div/div/div[1]/span')).getText();
            const cntQualityValue = await driver.findElement(By.xpath('//*[@id="app"]/div/div/div[1]/div/div/div[2]/div[1]/span')).getText();
            const earningValue = await driver.findElement(By.xpath('//*[@id="app"]/div/div/div[1]/div/div/div[2]/div[2]/div[2]/span')).getText();

            console.log(`Account: ${username}, Proxy: ${proxyUrl}, Status: ${statusValue}`);
            console.log(`Account: ${username}, Proxy: ${proxyUrl}, Conection quality: ${cntQualityValue}`);
            console.log(`Account: ${username}, Proxy: ${proxyUrl}, Earning value: ${earningValue}`);

            await driver.sleep(20000);
            console.log(`Account: ${username}, Proxy: ${proxyUrl}, Slept for 2 mins, starting new check.`);
        } catch (error) {
            console.log(`Account: ${username}, Proxy: ${proxyUrl}, Error fetching elements or token expired. Re-logging in...`);
            // Token expired or elements not found, so login again
            await this.login(false, username, password, proxyUrl, driver);  // Adjust the login call with required params
            await this.navigateToExtension(driver);  // Navigate to extension after re-login
            await this.farm(driver, username, proxyUrl);  // Retry the process after logging in again
        }
    }

    async check_gradient(driver, username, proxyUrl, isFirstLogin, last2minValueGradient) {
        if (isFirstLogin) { 
            await driver.sleep(5000);
            const closeButton = await driver.findElement(By.xpath('/html/body/div[3]/div/div[2]/div/div[1]/div/div/div/button'));
            await closeButton.click();
            await driver.sleep(1000);
            const yesButton = await driver.findElement(By.xpath('/html/body/div[2]/div/div[2]/div/div[1]/div/div/div/button'));
            await yesButton.click();
        }
        console.log(`Account: ${username}, Proxy: ${proxyUrl}, Refresh completed`);
        await driver.sleep(3000);

        // Check for the necessary elements (assuming the token expired or session expired)
        const statusValue = await driver.findElement(By.xpath('//*[@id="root-gradient-extension-popup-20240807"]/div/div[1]/div[2]/div[3]/div[2]/div/div[2]/div')).getText();
        const tapTodayValue = await driver.findElement(By.xpath('//*[@id="root-gradient-extension-popup-20240807"]/div/div[4]/div[1]/div[1]')).getText();
        const upTimeValue = await driver.findElement(By.xpath('//*[@id="root-gradient-extension-popup-20240807"]/div/div[4]/div[2]/div[1]')).getText();

        console.log(`Account: ${username}, Proxy: ${proxyUrl}, Status: ${statusValue}`);
        console.log(`Account: ${username}, Proxy: ${proxyUrl}, Tap today: ${tapTodayValue}`);
        console.log(`Account: ${username}, Proxy: ${proxyUrl}, Up time value: ${upTimeValue}`);

        const rewardButton = await driver.findElement(By.xpath('//*[@id="root-gradient-extension-popup-20240807"]/div/div[3]/div/div[3]'));
        await rewardButton.click();

        const todayRewardValue = await driver.findElement(By.xpath('//*[@id="root-gradient-extension-popup-20240807"]/div/div[4]/div[1]/div[1]')).getText();
        const sessionRewardValue = await driver.findElement(By.xpath('//*[@id="root-gradient-extension-popup-20240807"]/div/div[4]/div[2]/div[1]')).getText();
        
        console.log(`Account: ${username}, Proxy: ${proxyUrl}, today Reward: ${todayRewardValue}`);
        console.log(`Account: ${username}, Proxy: ${proxyUrl}, session Reward: ${sessionRewardValue}`);

        if (last2minValueGradient !== 0) {
        console.log(`Account: ${username}, Proxy: ${proxyUrl}, Increase after 2 mins: ${tapTodayValue - last2minValueGradient}`);
        }
        last2minValueGradient = parseFloat(tapTodayValue);
    }

    async check_toggle(driver, username, proxyUrl, last2minValueToggle) {
        console.log(`Account: ${username}, Proxy: ${proxyUrl}, Refresh completed`);
        await driver.sleep(3000);
        // Check for the necessary elements (assuming the token expired or session expired)
        const elementValue = await driver.findElement(By.xpath('//*[@id="root"]/div/div/div[4]/div[1]/p')).getText();
        const percentValue = await driver.findElement(By.xpath('//*[@id="root"]/div/div/div[2]/div/div/div/p')).getText();
        const upTimeValue = await driver.findElement(By.xpath('//*[@id="root"]/div/div/div[4]/div[2]/p')).getText();

        console.log(`Account: ${username}, Proxy: ${proxyUrl}, Connection quality: ${percentValue}`);
        console.log(`Account: ${username}, Proxy: ${proxyUrl}, Epoch value after 2 mins: ${elementValue}`);
        console.log(`Account: ${username}, Proxy: ${proxyUrl}, Up time value: ${upTimeValue}`);

        if (last2minValueToggle !== 0) {
        console.log(`Account: ${username}, Proxy: ${proxyUrl}, Increase after 2 mins: ${elementValue - last2minValueToggle}`);
        }

        last2minValueToggle = parseFloat(elementValue);
    }

}
    
module.exports = TokenPlugin;
