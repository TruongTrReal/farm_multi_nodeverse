// app_new.js
import fs from "fs";
import path from "path";
import { processProxies } from "./src/proxy/main.js";
import { processAccountsAndProxies } from "./src/proxy/assign_proxy.js";
import { resetDB } from "./src/db.js";
import TaskAutomationManager from "./src/automationTasksManager.js";


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
  // Remove the services option since services are now provided by the CSV.
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
      // Process proxies from the text file (unchanged)
      await processProxies("./input/proxy.txt");
      
      // Process accounts and proxies from the CSV file.
      // Note: Update the file name if needed (e.g. from accounts.txt to accounts.csv)
      await processAccountsAndProxies("./input/taikhoan.csv", './output');
    } else {
      console.log('Skipping proxy and account processing.');
    }

    // Run automation manager
    const manager = new TaskAutomationManager();
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
