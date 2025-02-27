// app_test.js
import fs from "fs";
import path from "path";
import AutomationManager from "./node_handler/automationManager.js";
import { processProxies } from "./proxy_handler/main.js";
import { processAccountsAndProxies } from "./proxy_handler/assign_proxy.js";
import { resetDB } from "./db_utils.js";


// Use yargs to parse command-line arguments
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const argv = yargs(hideBin(process.argv))
  .option('reset', {
    alias: 'r',
    type: 'boolean',
    description: 'Reset DB and delete profiles folder'
  })
  .option('proxy', {
    alias: 'p',
    type: 'boolean',
    description: 'Process proxies and assign them to accounts'
  })
  .option('services', {
    alias: 's',
    type: 'array',
    description: 'List of services to run',
    choices: ['gradient', 'toggle', 'bless', 'openloop', 'blockmesh', 'despeed', 'depined']
  })
  .help()
  .argv;


async function main() {
  try {
    if (argv.reset) {
      console.log('Resetting the database...');
      await resetDB();

      // Delete the profiles folder and its contents
      const profilesDir = path.join(__dirname, 'profiles');
      if (fs.existsSync(profilesDir)) {
        await fs.promises.rm(profilesDir, { recursive: true, force: true });
        console.log(`Deleted profiles folder: ${profilesDir}`);
      } else {
        console.log(`Profiles folder not found at: ${profilesDir}`);
      }
    } else {
      console.log('Skipping database reset.');
    }

    if (argv.proxy) {
      // console.log('Processing proxies from ./config/proxy.txt ...');
      await processProxies("./config/proxy.txt");

      const servicesChosen = argv.services;
      if (!servicesChosen || servicesChosen.length === 0) {
        console.error('No services provided. Please specify services using the --services option.');
        process.exit(1);
      }

      // console.log('Processing accounts and proxies from ./config/accounts.txt ...');
      await processAccountsAndProxies("./config/accounts.txt", './output', servicesChosen);
    } else {
      console.log('Skipping proxy and account processing.');
    }

    // Run automation manager
    const manager = new AutomationManager();
    await manager.run();

  } catch (e) {
    console.error('Main error:', e);
  }
}

// Ensure required directories exist
const directories = ['./output', './profiles'];
directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created missing directory: ${dir}`);
  }
});

main();