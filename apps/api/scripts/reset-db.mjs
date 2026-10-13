import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const dbPath = resolve(
  process.env.DATABASE_PATH ?? './data/agendalab.sqlite',
);

if (!existsSync(dbPath)) {
  console.log(`Database not found at ${dbPath}; nothing to reset.`);
  process.exit(0);
}

const db = new DatabaseSync(dbPath);
let transactionStarted = false;

try {
  db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  db.exec('BEGIN IMMEDIATE');
  transactionStarted = true;

  const result = db.prepare('DELETE FROM reservations').run();

  db.exec('COMMIT');
  transactionStarted = false;
  console.log(`Database reset complete. Removed ${result.changes} reservation(s).`);
} catch (error) {
  if (transactionStarted) db.exec('ROLLBACK');
  throw error;
} finally {
  db.close();
}
