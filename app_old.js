import AutomationManager from "./node_handler/automationManager.js";
import { processProxies } from "./proxy_handler/main.js";
import { processAccountsAndProxies } from "./proxy_handler/assign_proxy.js";
import { resetDB } from "./db_utils.js";
import fs from "fs";
import path from "path";
import readline from "readline";
import prompts from "prompts";

// Ensure required directories exist
const directories = ['./output', './profiles', './db', './config'];
directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created missing directory: ${dir}`);
  }
});

// Helper function to ask a question and return a Promise for the answer
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(query, answer => {
    rl.close();
    resolve(answer.trim().toLowerCase());
  }));
}

async function main() {
  try {
    // Ask if user wants to reset the DB
    const resetAnswer = await askQuestion('Có muốn xóa data cũ kh (profile, cache db) (y/n): ');
    if (resetAnswer === 'y' || resetAnswer === 'yes') {
      console.log('Resetting the database...');
      await resetDB();

      // Delete the profiles folder and its contents
      const profilesDir = path.join('profiles');
      if (fs.existsSync(profilesDir)) {
        await fs.promises.rm(profilesDir, { recursive: true, force: true });
        console.log(`Deleted profiles folder: ${profilesDir}`);
      } else {
        console.log(`Profiles folder not found at: ${profilesDir}`);
      }
    } else {
      console.log('Skipping database reset.');
    }

    // Ask if user wants to process proxies and assign them to accounts
    const proxyAnswer = await askQuestion('Có check và gán proxy lại cho các account kh? (y/n): ');
    if (proxyAnswer === 'y' || proxyAnswer === 'yes') {
      console.log('Processing proxies from ./config/proxy.txt ...');
      await processProxies("./config/proxy.txt");

      // Use prompts' multiselect to allow selection of multiple services
      const response = await prompts({
        type: 'multiselect',
        name: 'services',
        message: 'Select the services to run:',
        choices: [
          { title: 'gradient', value: 'gradient' },
          { title: 'toggle', value: 'toggle' },
          { title: 'bless', value: 'bless' },
          { title: 'openloop', value: 'openloop' },
          { title: 'blockmesh', value: 'blockmesh' },
          { title: 'despeed', value: 'despeed' },
          { title: 'depined', value: 'depined' }
        ],
        hint: '- Space to select. Return to submit',
        instructions: false,
        min: 1
      });

      const service_chosen = response.services;
      console.log('Selected services:', service_chosen);

      console.log('Processing accounts and proxies from ./config/accounts.txt ...');
      await processAccountsAndProxies("./config/accounts.txt", './output', service_chosen);
    } else {
      console.log('Skipping proxy and account processing.');
    }

    // Ask if user wants to run in headless mode
    const headlessAnswer = await askQuestion('Run in headless mode? (y/n): ');
    const headless = headlessAnswer === 'y' || headlessAnswer === 'yes';

    // Run automation manager
    const manager = new AutomationManager({ headless: true });
    await manager.run();

  } catch (e) {
    console.error('Main error:', e);
  }
}

main();
