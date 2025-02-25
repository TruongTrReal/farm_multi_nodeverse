// db_utils.js
import { initDB } from "./init_db.js";
import log4js from "log4js";





const logger = log4js.getLogger();

async function resetDB() {
  let db;
  try {
    db = await initDB();
    
    // Disable foreign key constraints (SQLite specific)
    await db.exec('PRAGMA foreign_keys = OFF;');
    
    // Drop tables in safe order
    await db.exec(`
      DROP TABLE IF EXISTS accounts_proxies;
      DROP TABLE IF EXISTS filtered_proxies;
      DROP TABLE IF EXISTS accounts;
      DROP TABLE IF EXISTS task_monitoring;
    `);

    // Re-enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON;');
    
    logger.info('Database reset successfully');
  } catch (error) {
    logger.error(`Database reset failed: ${error.message}`);
    throw error; // Re-throw to handle in caller
  } finally {
    if (db) {
      await db.close();
    }
  }
}

export { resetDB };
