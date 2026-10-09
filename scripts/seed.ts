import "dotenv/config";
import { ensureSeeded } from "../src/db/seed";
import { pool } from "../src/db";

ensureSeeded()
  .then(async () => {
    console.log("Dados iniciais prontos.");
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
