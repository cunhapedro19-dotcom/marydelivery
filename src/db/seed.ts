import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  adminUsers,
  establishments,
  meals,
  menuItems,
  paymentMethods,
} from "@/db/schema";
import { isValidWhatsApp } from "@/lib/format";
import { hashPassword } from "@/lib/password";

/* ---------- Acesso inicial do painel ---------- */

/** Nome de usuário criado junto com o Mary Delivery (para criar outros, use o script scripts/create-establishment.ts). */
export const DEFAULT_ADMIN_USERNAME = "admin";

/** Senha inicial — o painel avisa até você trocar em Configurações → Meu acesso. */
export const DEFAULT_ADMIN_PASSWORD = "mary-lanches-2026";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = Tx | typeof db;

let seededInThisProcess = false;

/**
 * Cria o Mary Delivery na primeira execução (banco vazio): dados do negócio,
 * WhatsApp que recebe os pedidos, cardápio de exemplo, pagamentos e o acesso ao painel.
 */
export async function ensureSeeded(): Promise<void> {
  if (seededInThisProcess) return;

  await db.transaction(async (tx) => {
    // Evita que duas requisições simultâneas criem os dados em duplicidade
    await tx.execute(sql`select pg_advisory_xact_lock(4242)`);
    const existing = await tx.select({ id: establishments.id }).from(establishments).limit(1);
    if (existing.length === 0) {
      const est = await createEstablishment(tx, {
        slug: "mary-delivery",
        name: "Mary Delivery",
        emoji: "🍔",
        description: "Delivery de lanches artesanais.",
        // WhatsApp do dono: (21) 96628-6896
        whatsappNumber: "5521966286896",
        adminUsername: DEFAULT_ADMIN_USERNAME,
        adminEmail: null,
        adminPassword: process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD,
      });
      await seedMenuExemplo(tx, est.id);
      // Nasce PAUSADO: o cardápio de exemplo é só um ponto de partida.
      // Toque em "REABRIR PEDIDOS" no painel quando o cardápio real estiver pronto.
      await tx.update(establishments).set({ acceptingOrders: false }).where(eq(establishments.id, est.id));
    }
  });

  seededInThisProcess = true;
}

export type NewEstablishmentInput = {
  slug: string;
  name: string;
  emoji?: string;
  description?: string;
  whatsappNumber?: string;
  adminUsername: string;
  adminEmail?: string | null;
  adminPassword: string;
  pickupEnabled?: boolean;
  pickupAddress?: string;
  pickupHours?: string;
  ownDeliveryEnabled?: boolean;
  appDeliveryEnabled?: boolean;
  appDeliveryService?: string;
  heroUrl?: string | null;
  openingDays?: string;
  openingHours?: string;
  deliveryAreas?: string;
  deliveryNotes?: string;
};

/**
 * Cria um estabelecimento com o usuário administrador e as formas de pagamento padrão.
 * Usado pelo seed e pelo script `scripts/create-establishment.ts`.
 */
export async function createEstablishment(executor: Executor, input: NewEstablishmentInput) {
  const [est] = await executor
    .insert(establishments)
    .values({
      slug: input.slug,
      name: input.name,
      emoji: input.emoji ?? "🍔",
      description: input.description ?? "",
      heroUrl: input.heroUrl ?? null,
      whatsappNumber: input.whatsappNumber ?? "",
      // Sem WhatsApp válido o cardápio nasce pausado: só abre depois que o número for cadastrado no painel
      acceptingOrders: isValidWhatsApp(input.whatsappNumber ?? ""),
      openingDays: input.openingDays ?? "",
      openingHours: input.openingHours ?? "",
      pausedMessage: "Voltamos em breve!",
      pickupEnabled: input.pickupEnabled ?? true,
      pickupAddress: input.pickupAddress ?? "",
      pickupHours: input.pickupHours ?? "",
      ownDeliveryEnabled: input.ownDeliveryEnabled ?? true,
      appDeliveryEnabled: input.appDeliveryEnabled ?? false,
      appDeliveryService: input.appDeliveryService ?? "",
      deliveryAreas: input.deliveryAreas ?? "",
      deliveryNotes: input.deliveryNotes ?? "",
    })
    .returning();

  await executor.insert(adminUsers).values({
    establishmentId: est.id,
    username: input.adminUsername.trim().toLowerCase(),
    // E-mail é opcional — dá pra cadastrar depois no painel (Configurações → Meu acesso)
    email: input.adminEmail?.trim().toLowerCase() || null,
    passwordHash: hashPassword(input.adminPassword),
  });

  await executor.insert(paymentMethods).values([
    { establishmentId: est.id, name: "Pix", sortOrder: 1 },
    { establishmentId: est.id, name: "Dinheiro", asksChange: true, sortOrder: 2 },
    { establishmentId: est.id, name: "Cartão", sortOrder: 3 },
  ]);

  return est;
}

/**
 * Cardápio de EXEMPLO para você começar a editar no painel: alguns lanches, porção, adicionais e bebidas.
 * Troque nomes, preços e fotos em Cardápio → Produtos antes de reabrir os pedidos.
 */
async function seedMenuExemplo(executor: Executor, establishmentId: number) {
  await executor.insert(menuItems).values([
    // Adicionais
    { establishmentId, category: "extra", name: "Bacon", priceCents: 500, sortOrder: 1 },
    { establishmentId, category: "extra", name: "Cheddar extra", priceCents: 300, sortOrder: 2 },
    { establishmentId, category: "extra", name: "Ovo", priceCents: 200, sortOrder: 3 },
    // Bebidas
    { establishmentId, category: "drink", name: "Coca-Cola", description: "Lata 350ml", priceCents: 500, sortOrder: 1 },
    { establishmentId, category: "drink", name: "Guaraná", description: "Lata 350ml", priceCents: 500, sortOrder: 2 },
    { establishmentId, category: "drink", name: "Suco natural", description: "Copo 300ml", priceCents: 600, sortOrder: 3 },
  ]);

  await executor.insert(meals).values([
    { establishmentId, name: "X-Burger", category: "Lanches", description: "Pão, hambúrguer 150g, queijo, alface e tomate.", priceCents: 2200, sortOrder: 1, maxChoices: 0 },
    { establishmentId, name: "X-Salada", category: "Lanches", description: "Pão, hambúrguer 150g, queijo, salada completa e maionese da casa.", priceCents: 2500, sortOrder: 2, maxChoices: 0 },
    { establishmentId, name: "X-Bacon", category: "Lanches", description: "Pão, hambúrguer 150g, queijo e bacon crocante.", priceCents: 2900, sortOrder: 3, maxChoices: 0 },
    { establishmentId, name: "X-Frango", category: "Lanches", description: "Pão, filé de frango grelhado, queijo, alface e tomate.", priceCents: 2400, sortOrder: 4, maxChoices: 0 },
    { establishmentId, name: "Batata frita", category: "Porções", description: "Porção média, serve 2 pessoas.", priceCents: 1200, sortOrder: 5, maxChoices: 0, allowExtras: false },
  ]);
}
