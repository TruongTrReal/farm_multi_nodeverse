const Farm = require('./node_handler/automation');
const { processProxies } = require('./proxy_handler/main');
const { processAccountsAndProxies } = require('./proxy_handler/assign_proxy');

const accountFilePath = "./config/accounts.txt";
const outputFilePath = "./config/account_with_proxy.json";


async function main () {
  // Proxy processing
  await processProxies()
  // Account processing
  const assignedAccounts = await processAccountsAndProxies(accountFilePath, outputFilePath);


  const exe = new Farm();

  // Call the run method to start the automation
  exe.run().then(() => {
    console.log("Farm automation completed.");
  }).catch(err => {
    console.error("Error running farm automation:", err);
  });

}

main()