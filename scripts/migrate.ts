import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { databasePool } from "../src/lib/db/pool";

// Menerapkan db/schema.sql. Aman dijalankan berulang kali.
async function main(): Promise<void> {
  const schemaSql = readFileSync(resolve(process.cwd(), "db/schema.sql"), "utf8");
  await databasePool.query(schemaSql);
  console.log("Skema database siap.");
}

main()
  .catch(function handleError(error) {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(function closePool() {
    return databasePool.end();
  });
