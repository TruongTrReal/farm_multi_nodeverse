const Farm = require('./node_handler/automation');
const { processProxies } = require('./proxy_handler/main');
const { processAccountsAndProxies } = require('./proxy_handler/assign_proxy');

const accountFilePath = "./config/accounts.txt";
const outputFilePath = "./config/account_with_proxy.json";

// account and proxy processing
// processProxies()
// processAccountsAndProxies(accountFilePath, outputFilePath)

// Create an instance of the Farm class
const exe = new Farm();

// Call the run method to start the automation
exe.run().then(() => {
  console.log("Farm automation completed.");
}).catch(err => {
  console.error("Error running farm automation:", err);
});
