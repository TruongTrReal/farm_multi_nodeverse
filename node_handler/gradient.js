// node_handler/openloop.js
const { By, until } = require('selenium-webdriver');

class OpenLoopPlugin {
    validateInputs(isFirstRun, username, password, proxyUrl, driver) {
        if (typeof isFirstRun !== 'boolean') {
            throw new Error('isFirstRun must be a boolean');
        }
        if (typeof username !== 'string') {
            throw new Error('username must be a string');
        }
        if (typeof password !== 'string') {
            throw new Error('password must be a string');
        }
        if (typeof proxyUrl !== 'string') {
            throw new Error('proxyUrl must be a string');
        }
        if (!(driver && typeof driver.get === 'function')) {
            throw new Error('driver must be a valid WebDriver object');
        }
    }

    // Function to log in to the application
    async login() {
        const url = 'https://app.gradient.network/';

        if (isFirstRun) {
        console.log(`Account: ${username}, Proxy: ${proxyUrl}, it is first run, login url will be open automatically`);
        await driver.get(url);
        // close the 2nd tab
        // Get all window handles
        let handles = await driver.getAllWindowHandles();

        // Switch to the second tab 
        await driver.switchTo().window(handles[1]);

        // Perform any actions on the new tab if needed
        
        // Close the current tab 
        await driver.close();

        await driver.switchTo().window(handles[0]);

        } else {
        await driver.get(url);
        }
        
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


    async navigateToExtension(driver, callback) {
        if (typeof driver.get !== 'function') {
            throw new Error('driver must be a valid WebDriver object');
        }
        await driver.get('chrome-extension://effapmdildnpkiaeghlkicpfflpiambm/dist/popup/index.html');
        await driver.sleep(3000);  // Wait for the extension to load
    }

    async farmAndLog(driver, username, proxyUrl) {
        if (typeof username !== 'string') {
            throw new Error('username must be a string');
        }
        if (typeof proxyUrl !== 'string') {
            throw new Error('proxyUrl must be a string');
        }
        if (!(driver && typeof driver.get === 'function')) {
            throw new Error('driver must be a valid WebDriver object');
        }

        try {
            while (true) {
                await driver.navigate().refresh();
                console.log(`Account: ${username}, Proxy: ${proxyUrl}, Refresh completed`);
                await driver.sleep(3000);

                // Check for the necessary elements (assuming the token expired or session expired)
                const statusValue = await driver.findElement(By.xpath('//*[@id="app"]/div/div/div[1]/div/div/div[1]/span')).getText();
                const cntQualityValue = await driver.findElement(By.xpath('//*[@id="app"]/div/div/div[1]/div/div/div[2]/div[1]/span')).getText();
                const earningValue = await driver.findElement(By.xpath('//*[@id="app"]/div/div/div[1]/div/div/div[2]/div[2]/div[2]/span')).getText();

                console.log(`Account: ${username}, Proxy: ${proxyUrl}, Status: ${statusValue}`);
                console.log(`Account: ${username}, Proxy: ${proxyUrl}, Conection quality: ${cntQualityValue}`);
                console.log(`Account: ${username}, Proxy: ${proxyUrl}, Earning value: ${earningValue}`);

                await driver.sleep(120000);  // Sleep for 2 minutes
                console.log(`Account: ${username}, Proxy: ${proxyUrl}, Slept for 2 mins, starting new check.`);
            }
        } catch (error) {
            console.log(`Account: ${username}, Proxy: ${proxyUrl}, Error fetching elements or token expired. Re-logging in...`);

            // Token expired or elements not found, so login again
            await this.login(false, username, '', proxyUrl, driver);  // Adjust the login call with required params
            await this.navigateToExtension(driver);  // Navigate to extension after re-login
            await this.farmAndLog(driver, username, proxyUrl);  // Retry the process after logging in again
        }
    }
}

module.exports = OpenLoopPlugin;
