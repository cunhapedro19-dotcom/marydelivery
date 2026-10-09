import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// A conexão do banco vem do .env (DATABASE_URL) — nunca deixe senha fixa aqui.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
