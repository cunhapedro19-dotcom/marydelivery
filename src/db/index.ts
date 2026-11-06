import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Constrói a string de conexão forçando SSL para nuvem (Supabase, Neon, etc.)
// A DATABASE_URL deve vir do .env (local) ou da Vercel (produção).
// Se não houver, falha rápido — melhor build falhar do que site no ar quebrado.
function buildConnectionString() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL não definida. Configure no .env local ou na Vercel.");
  }
  // Supabase pooler (porta 6543) exige sslmode=require
  // Evita duplicar parâmetros se já vier na URL
  const hasSslMode = /[?&]sslmode=/.test(url);
  return hasSslMode ? url : `${url}${url.includes("?") ? "&" : "?"}sslmode=require`;
}

const pool = new Pool({
  connectionString: buildConnectionString(),
  // Evita erro "prepared statement already exists" com pgbouncer (Supabase pooler)
  max: 1,
});

export const db = drizzle(pool, { schema });