// init_db.js
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";



// You can change 'accounts.db' to any DB filename you prefer
const DB_PATH = path.resolve('./db/cache.db');

async function initDB() {
  // Open (or create) the database
  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  // Create tables if they don't exist:
  await db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT
    );

    CREATE TABLE IF NOT EXISTS phantom_keys (
      id INTEGER PRIMARY KEY,
      key TEXT UNIQUE
    );

    CREATE TABLE IF NOT EXISTS accounts_proxies (
      account_id INTEGER,
      proxy TEXT UNIQUE,
      services TEXT,
      FOREIGN KEY(account_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS filtered_proxies (
      proxy   TEXT UNIQUE PRIMARY KEY,
      success TEXT NOT NULL,
      fail    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_monitoring (
      id INTEGER PRIMARY KEY,
      account_id INTEGER NOT NULL,
      proxy TEXT NOT NULL,
      service TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      point INTEGER NOT NULL DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(account_id) REFERENCES accounts(id)
    );
  `);

  return db;
}


// Export the initDB function so other files (like app.js) can use it
export { initDB };
