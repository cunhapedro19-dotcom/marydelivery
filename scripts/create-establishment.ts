import "dotenv/config";
import { db } from "@/db";
import { createEstablishment, DEFAULT_ADMIN_PASSWORD } from "@/db/seed";
import { toSlug } from "@/lib/format";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

async function main() {
  const rl = readline.createInterface({ input, output });

  console.log("=== Criar novo estabelecimento ===\n");

  const name = await rl.question("Nome do estabelecimento: ");
  if (!name.trim()) {
    console.log("Nome é obrigatório.");
    process.exit(1);
  }

  const suggestedSlug = toSlug(name);
  const slug = (await rl.question(`Slug (URL amigável) [${suggestedSlug}]: `)) || suggestedSlug;

  const emoji = (await rl.question("Emoji [🍲]: ")) || "🍲";
  const description = (await rl.question("Descrição/slogan: ")) || "";
  const whatsapp = (await rl.question("WhatsApp (só dígitos, ex: 5521999999999): ")) || "";
  const adminUser = (await rl.question("Usuário admin [admin]: ")) || "admin";
  const adminPass = (await rl.question(`Senha admin [${DEFAULT_ADMIN_PASSWORD}]: `)) || DEFAULT_ADMIN_PASSWORD;

  console.log("\nCriando...");

  try {
    await createEstablishment(db, {
      slug,
      name: name.trim(),
      emoji,
      description: description.trim(),
      whatsappNumber: whatsapp.trim(),
      adminUsername: adminUser.trim().toLowerCase(),
      adminEmail: null,
      adminPassword: adminPass,
    });
    console.log(`\n✅ Estabelecimento "${name}" criado com sucesso!`);
    console.log(`   Slug: ${slug}`);
    console.log(`   Admin: ${adminUser} / ${adminPass}`);
    console.log(`   URL do cardápio: /${slug}`);
    console.log(`   Painel: /admin (login com as credenciais acima)`);
  } catch (err) {
    console.error("\n❌ Erro:", (err as Error).message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();