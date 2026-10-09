/**
 * Cria um estabelecimento (com usuário administrador e formas de pagamento padrão).
 *
 * Uso:
 *   npx tsx scripts/create-establishment.ts --nome "Mary Delivery" --usuario admin --senha minhasenha \
 *     [--slug mary-delivery] [--whatsapp "(21) 99999-9999"] [--email dono@email.com] [--emoji 🍔]
 */
import "dotenv/config";
import { createEstablishment } from "../src/db/seed";
import { db, pool } from "../src/db";
import { isValidSlug, isValidWhatsApp, normalizeWhatsApp, slugify } from "../src/lib/format";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const name = arg("nome");
  const username = (arg("usuario") || "").toLowerCase();
  const email = arg("email");
  const password = arg("senha");
  if (!name || !username || !password) {
    console.error('Uso: npx tsx scripts/create-establishment.ts --nome "Nome" --usuario admin --senha 123456 [--slug meu-slug] [--whatsapp "(21) 99999-9999"] [--email dono@email.com]');
    process.exit(1);
  }
  if (!/^[a-z0-9_.-]{3,30}$/.test(username)) {
    console.error('Usuário inválido: use 3 a 30 letras minúsculas, números, ponto, hífen ou underline.');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("A senha precisa ter pelo menos 6 caracteres.");
    process.exit(1);
  }
  const slug = slugify(arg("slug") || name);
  if (!isValidSlug(slug)) {
    console.error(`Endereço inválido: "${slug}". Use de 3 a 40 letras minúsculas, números ou hífens.`);
    process.exit(1);
  }
  const whatsappRaw = arg("whatsapp") || "";
  const whatsappNumber = whatsappRaw ? normalizeWhatsApp(whatsappRaw) : "";
  if (whatsappRaw && !isValidWhatsApp(whatsappNumber)) {
    console.error(`WhatsApp inválido: "${whatsappRaw}". Use DDD + número, ex.: "(21) 99999-9999".`);
    process.exit(1);
  }

  const est = await db.transaction((tx) =>
    createEstablishment(tx, {
      slug,
      name,
      emoji: arg("emoji") || "🍔",
      whatsappNumber,
      adminUsername: username,
      adminEmail: email ?? null,
      adminPassword: password,
      pickupEnabled: true,
      ownDeliveryEnabled: true,
    }),
  );

  console.log(`✅ Estabelecimento criado: ${est.name}`);
  console.log(`   Cardápio: /${est.slug}`);
  console.log(`   Painel:   /admin  (usuário: ${username}${email ? ` · e-mail: ${email}` : ""})`);
  if (whatsappNumber) {
    console.log(`   WhatsApp dos pedidos: +${whatsappNumber} (já recebendo pedidos)`);
  } else {
    console.log("   ⚠️ O cardápio começa pausado: cadastre o WhatsApp em Configurações → WhatsApp e depois toque em REABRIR PEDIDOS.");
  }
  console.log("   Próximos passos no painel: WhatsApp, Entrega, Produtos.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
