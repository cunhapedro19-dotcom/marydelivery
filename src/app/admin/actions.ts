"use server";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  adminUsers,
  establishments,
  mealItems,
  meals,
  menuItems,
  orders,
  paymentMethods,
  type MealRole,
} from "@/db/schema";
import {
  authenticate,
  createSession,
  destroySession,
  hashPassword,
  requireAdmin,
  verifyPassword,
} from "@/lib/auth";
import { getEstablishmentBySlug } from "@/lib/data";
import {
  CATEGORY_SLUGS,
  isValidSlug,
  isValidWhatsApp,
  normalizeWhatsApp,
  parsePriceToCents,
  slugify,
  type CategorySlug,
} from "@/lib/format";

export type ActionResult = { ok: boolean; message: string } | null;

function refresh() {
  revalidatePath("/", "layout");
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

async function touch(establishmentId: number) {
  await db.update(establishments).set({ updatedAt: new Date() }).where(eq(establishments.id, establishmentId));
}

/* ---------- Acesso ---------- */

export async function loginAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const identifier = text(formData, "identifier");
  const password = String(formData.get("password") ?? "");
  if (!identifier || !password) return { ok: false, message: "Preencha usuário e senha." };
  const user = await authenticate(identifier, password);
  if (!user) return { ok: false, message: "Usuário ou senha incorretos." };
  await createSession(user.id);
  redirect("/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

export async function changePasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireAdmin();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (next.length < 6) return { ok: false, message: "A nova senha precisa ter pelo menos 6 caracteres." };
  if (next !== confirm) return { ok: false, message: "A confirmação não é igual à nova senha." };
  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, session.userId)).limit(1);
  if (!user || !verifyPassword(current, user.passwordHash)) {
    return { ok: false, message: "A senha atual está incorreta." };
  }
  await db.update(adminUsers).set({ passwordHash: hashPassword(next) }).where(eq(adminUsers.id, user.id));
  refresh();
  return { ok: true, message: "Senha alterada com sucesso ✅" };
}

/** Cadastra (ou troca) o e-mail de acesso — opcional. Vazio = remover. */
export async function saveLoginEmailAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireAdmin();
  const email = text(formData, "email").toLowerCase();
  if (!email) {
    await db.update(adminUsers).set({ email: null }).where(eq(adminUsers.id, session.userId));
    refresh();
    return { ok: true, message: "E-mail removido. Você entra só com o usuário." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Digite um e-mail válido." };
  }
  const taken = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  if (taken[0] && taken[0].id !== session.userId) {
    return { ok: false, message: "Esse e-mail já está em uso por outro acesso." };
  }
  await db.update(adminUsers).set({ email }).where(eq(adminUsers.id, session.userId));
  refresh();
  return { ok: true, message: "E-mail salvo ✅ Agora dá pra entrar com ele também." };
}

/* ---------- Abrir / pausar pedidos ---------- */

export async function toggleAcceptingOrdersAction() {
  const { establishmentId } = await requireAdmin();
  const [row] = await db
    .select({ accepting: establishments.acceptingOrders, whatsapp: establishments.whatsappNumber })
    .from(establishments)
    .where(eq(establishments.id, establishmentId));
  const next = !(row?.accepting ?? true);
  // Não dá para publicar o cardápio sem um WhatsApp válido para receber os pedidos
  if (next && !isValidWhatsApp(row?.whatsapp ?? "")) {
    redirect("/admin/configuracoes/whatsapp?motivo=publicar");
  }
  await db
    .update(establishments)
    .set({ acceptingOrders: next, updatedAt: new Date() })
    .where(eq(establishments.id, establishmentId));
  refresh();
}

/* ---------- Itens do cardápio ---------- */

function categoryFromSlug(slug: string) {
  return (CATEGORY_SLUGS as Record<string, (typeof CATEGORY_SLUGS)[CategorySlug]>)[slug] ?? null;
}

export async function saveItemAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { establishmentId } = await requireAdmin();
  const slug = text(formData, "category");
  const category = categoryFromSlug(slug);
  if (!category) return { ok: false, message: "Categoria inválida." };

  const id = Number(formData.get("id") || 0);
  const name = text(formData, "name");
  if (!name) return { ok: false, message: "Informe o nome." };
  const values = {
    name,
    description: text(formData, "description"),
    priceCents: parsePriceToCents(text(formData, "price")),
    imageUrl: text(formData, "imageUrl") || null,
    available: formData.get("available") === "on",
  };

  if (id) {
    await db
      .update(menuItems)
      .set(values)
      .where(and(eq(menuItems.id, id), eq(menuItems.establishmentId, establishmentId)));
  } else {
    const [max] = await db
      .select({ m: sql<number>`coalesce(max(${menuItems.sortOrder}), 0)` })
      .from(menuItems)
      .where(and(eq(menuItems.establishmentId, establishmentId), eq(menuItems.category, category)));
    await db
      .insert(menuItems)
      .values({ ...values, establishmentId, category, sortOrder: Number(max?.m ?? 0) + 1 });
  }
  refresh();
  redirect(`/admin/cardapio/${slug}?salvo=1`);
}

export async function toggleItemAction(id: number) {
  const { establishmentId } = await requireAdmin();
  const [item] = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.id, id), eq(menuItems.establishmentId, establishmentId)))
    .limit(1);
  if (!item) return;
  await db.update(menuItems).set({ available: !item.available }).where(eq(menuItems.id, item.id));
  refresh();
}

export async function deleteItemAction(id: number, slug: string) {
  const { establishmentId } = await requireAdmin();
  await db.delete(menuItems).where(and(eq(menuItems.id, id), eq(menuItems.establishmentId, establishmentId)));
  refresh();
  redirect(`/admin/cardapio/${slug}?excluido=1`);
}

export async function moveItemAction(id: number, direction: "up" | "down") {
  const { establishmentId } = await requireAdmin();
  const [item] = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.id, id), eq(menuItems.establishmentId, establishmentId)))
    .limit(1);
  if (!item) return;
  const list = await db
    .select({ id: menuItems.id })
    .from(menuItems)
    .where(and(eq(menuItems.establishmentId, establishmentId), eq(menuItems.category, item.category)))
    .orderBy(asc(menuItems.sortOrder), asc(menuItems.id));
  const index = list.findIndex((x) => x.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= list.length) return;
  const ids = list.map((x) => x.id);
  [ids[index], ids[target]] = [ids[target], ids[index]];
  await db.transaction(async (tx) => {
    for (let i = 0; i < ids.length; i++) {
      await tx.update(menuItems).set({ sortOrder: i + 1 }).where(eq(menuItems.id, ids[i]));
    }
  });
  refresh();
}

export async function setDrinkRequiredAction(formData: FormData) {
  const { establishmentId } = await requireAdmin();
  const required = formData.get("drinkRequired") === "1";
  await db
    .update(establishments)
    .set({ drinkRequired: required, updatedAt: new Date() })
    .where(eq(establishments.id, establishmentId));
  refresh();
}

/* ---------- Produtos ---------- */

function idList(formData: FormData, key: string): number[] {
  return Array.from(new Set(formData.getAll(key).map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0)));
}

export async function saveMealAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { establishmentId } = await requireAdmin();
  const id = Number(formData.get("id") || 0);
  const name = text(formData, "name");
  if (!name) return { ok: false, message: "Informe o nome do produto." };

  const values = {
    name,
    category: text(formData, "categoryName"),
    description: text(formData, "description"),
    priceCents: parsePriceToCents(text(formData, "price")),
    imageUrl: text(formData, "imageUrl") || null,
    available: formData.get("available") === "on",
    maxChoices: Math.min(10, Math.max(0, Number(formData.get("maxChoices") || 0))),
    allowExtras: formData.get("allowExtras") === "on",
    allowNotes: formData.get("allowNotes") === "on",
  };

  // Só itens do próprio estabelecimento; um item só pode ter um papel ("já incluso" tem prioridade)
  const ownItems = new Set(
    (
      await db
        .select({ id: menuItems.id })
        .from(menuItems)
        .where(eq(menuItems.establishmentId, establishmentId))
    ).map((r) => r.id),
  );
  const included = idList(formData, "included").filter((i) => ownItems.has(i));
  const proteins = idList(formData, "protein").filter((i) => ownItems.has(i) && !included.includes(i));
  const choices = idList(formData, "choice").filter((i) => ownItems.has(i) && !included.includes(i) && !proteins.includes(i));

  await db.transaction(async (tx) => {
    let mealId = id;
    if (id) {
      const updated = await tx
        .update(meals)
        .set(values)
        .where(and(eq(meals.id, id), eq(meals.establishmentId, establishmentId)))
        .returning({ id: meals.id });
      if (!updated[0]) throw new Error("Produto não encontrado.");
    } else {
      const [max] = await tx
        .select({ m: sql<number>`coalesce(max(${meals.sortOrder}), 0)` })
        .from(meals)
        .where(eq(meals.establishmentId, establishmentId));
      const [row] = await tx
        .insert(meals)
        .values({ ...values, establishmentId, sortOrder: Number(max?.m ?? 0) + 1 })
        .returning({ id: meals.id });
      mealId = row.id;
    }
    await tx.delete(mealItems).where(eq(mealItems.mealId, mealId));
    const rows: { mealId: number; itemId: number; role: MealRole }[] = [
      ...included.map((itemId) => ({ mealId, itemId, role: "included" as const })),
      ...proteins.map((itemId) => ({ mealId, itemId, role: "protein" as const })),
      ...choices.map((itemId) => ({ mealId, itemId, role: "choice" as const })),
    ];
    if (rows.length) await tx.insert(mealItems).values(rows);
  });

  refresh();
  redirect("/admin/cardapio/produtos?salvo=1");
}

export async function toggleMealAction(id: number) {
  const { establishmentId } = await requireAdmin();
  const [meal] = await db
    .select()
    .from(meals)
    .where(and(eq(meals.id, id), eq(meals.establishmentId, establishmentId)))
    .limit(1);
  if (!meal) return;
  await db.update(meals).set({ available: !meal.available }).where(eq(meals.id, meal.id));
  refresh();
}

export async function deleteMealAction(id: number) {
  const { establishmentId } = await requireAdmin();
  await db.delete(meals).where(and(eq(meals.id, id), eq(meals.establishmentId, establishmentId)));
  refresh();
  redirect("/admin/cardapio/produtos?excluido=1");
}

export async function moveMealAction(id: number, direction: "up" | "down") {
  const { establishmentId } = await requireAdmin();
  const list = await db
    .select({ id: meals.id })
    .from(meals)
    .where(eq(meals.establishmentId, establishmentId))
    .orderBy(asc(meals.sortOrder), asc(meals.id));
  const index = list.findIndex((x) => x.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= list.length) return;
  const ids = list.map((x) => x.id);
  [ids[index], ids[target]] = [ids[target], ids[index]];
  await db.transaction(async (tx) => {
    for (let i = 0; i < ids.length; i++) {
      await tx.update(meals).set({ sortOrder: i + 1 }).where(eq(meals.id, ids[i]));
    }
  });
  refresh();
}

/* ---------- Configurações: dados do negócio ---------- */

export async function saveBusinessAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { establishmentId } = await requireAdmin();
  const name = text(formData, "name");
  if (!name) return { ok: false, message: "Informe o nome do negócio." };
  const rawSlug = text(formData, "slug");
  const slug = slugify(rawSlug || name);
  if (!isValidSlug(slug)) {
    return { ok: false, message: "O endereço do cardápio precisa ter de 3 a 40 letras minúsculas, números ou hífens." };
  }
  const taken = await getEstablishmentBySlug(slug);
  if (taken && taken.id !== establishmentId) {
    return { ok: false, message: "Esse endereço já está em uso por outro estabelecimento. Escolha outro." };
  }
  const emoji = text(formData, "emoji").slice(0, 8) || "🍲";
  await db
    .update(establishments)
    .set({
      name,
      slug,
      emoji,
      description: text(formData, "description"),
      logoUrl: text(formData, "logoUrl") || null,
      heroUrl: text(formData, "heroUrl") || null,
      updatedAt: new Date(),
    })
    .where(eq(establishments.id, establishmentId));
  refresh();
  return { ok: true, message: "Dados do negócio salvos ✅" };
}

/* ---------- Configurações: WhatsApp ---------- */

export async function saveWhatsAppAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { establishmentId } = await requireAdmin();
  const number = normalizeWhatsApp(text(formData, "whatsappNumber"));
  if (!isValidWhatsApp(number)) {
    return { ok: false, message: "⚠️ Digite um número de WhatsApp válido (DDD + número, ex.: (21) 99999-9999)." };
  }
  // O número é salvo no formato internacional (ex.: 5521999999999), sempre ligado a este estabelecimento
  await db
    .update(establishments)
    .set({
      whatsappNumber: number,
      whatsappGreeting: text(formData, "whatsappGreeting").slice(0, 200),
      updatedAt: new Date(),
    })
    .where(eq(establishments.id, establishmentId));
  refresh();
  return { ok: true, message: "✅ Número do WhatsApp atualizado. Os próximos pedidos já vão para ele." };
}

/* ---------- Configurações: entrega / recebimento ---------- */

export async function saveDeliveryAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { establishmentId } = await requireAdmin();
  const pickupEnabled = formData.get("pickupEnabled") === "on";
  const ownDeliveryEnabled = formData.get("ownDeliveryEnabled") === "on";
  const appDeliveryEnabled = formData.get("appDeliveryEnabled") === "on";
  const pickupAddress = text(formData, "pickupAddress");
  const appDeliveryService = text(formData, "appDeliveryService").slice(0, 60);

  if (!pickupEnabled && !ownDeliveryEnabled && !appDeliveryEnabled) {
    return { ok: false, message: "Ative pelo menos uma forma de recebimento." };
  }
  if (pickupEnabled && !pickupAddress) {
    return { ok: false, message: "Informe o endereço para retirada." };
  }
  if (appDeliveryEnabled && !appDeliveryService) {
    return { ok: false, message: "Informe qual serviço de entrega por aplicativo você usa." };
  }

  await db
    .update(establishments)
    .set({
      pickupEnabled,
      pickupAddress,
      pickupHours: text(formData, "pickupHours"),
      ownDeliveryEnabled,
      appDeliveryEnabled,
      appDeliveryService,
      deliveryAreas: text(formData, "deliveryAreas"),
      deliveryNotes: text(formData, "deliveryNotes"),
      updatedAt: new Date(),
    })
    .where(eq(establishments.id, establishmentId));
  refresh();
  return { ok: true, message: "Formas de recebimento salvas ✅" };
}

/* ---------- Configurações: horários ---------- */

export async function saveHoursAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { establishmentId } = await requireAdmin();
  await db
    .update(establishments)
    .set({
      openingDays: text(formData, "openingDays"),
      openingHours: text(formData, "openingHours"),
      pausedMessage: text(formData, "pausedMessage"),
      updatedAt: new Date(),
    })
    .where(eq(establishments.id, establishmentId));
  refresh();
  return { ok: true, message: "Horários salvos ✅" };
}

/* ---------- Formas de pagamento ---------- */

export async function addPaymentMethodAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { establishmentId } = await requireAdmin();
  const name = text(formData, "name");
  if (!name) return { ok: false, message: "Informe o nome da forma de pagamento." };
  const [max] = await db
    .select({ m: sql<number>`coalesce(max(${paymentMethods.sortOrder}), 0)` })
    .from(paymentMethods)
    .where(eq(paymentMethods.establishmentId, establishmentId));
  await db.insert(paymentMethods).values({
    establishmentId,
    name,
    asksChange: formData.get("asksChange") === "on",
    sortOrder: Number(max?.m ?? 0) + 1,
  });
  await touch(establishmentId);
  refresh();
  return { ok: true, message: `"${name}" adicionado ✅` };
}

export async function updatePaymentMethodAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { establishmentId } = await requireAdmin();
  const id = Number(formData.get("id"));
  const name = text(formData, "name");
  if (!id || !name) return { ok: false, message: "Informe o nome." };
  await db
    .update(paymentMethods)
    .set({ name, asksChange: formData.get("asksChange") === "on" })
    .where(and(eq(paymentMethods.id, id), eq(paymentMethods.establishmentId, establishmentId)));
  refresh();
  return { ok: true, message: "Forma de pagamento atualizada ✅" };
}

export async function togglePaymentMethodAction(id: number) {
  const { establishmentId } = await requireAdmin();
  const [pm] = await db
    .select()
    .from(paymentMethods)
    .where(and(eq(paymentMethods.id, id), eq(paymentMethods.establishmentId, establishmentId)))
    .limit(1);
  if (!pm) return;
  await db.update(paymentMethods).set({ active: !pm.active }).where(eq(paymentMethods.id, pm.id));
  refresh();
}

export async function deletePaymentMethodAction(id: number) {
  const { establishmentId } = await requireAdmin();
  await db
    .delete(paymentMethods)
    .where(and(eq(paymentMethods.id, id), eq(paymentMethods.establishmentId, establishmentId)));
  refresh();
}

/* ---------- Pedidos registrados ---------- */

export async function toggleOrderDoneAction(id: number) {
  const { establishmentId } = await requireAdmin();
  const [order] = await db
    .select({ id: orders.id, done: orders.done })
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.establishmentId, establishmentId)))
    .limit(1);
  if (!order) return;
  await db.update(orders).set({ done: !order.done }).where(eq(orders.id, order.id));
  refresh();
}

export async function deleteOrdersAction(ids: number[]) {
  const { establishmentId } = await requireAdmin();
  if (!ids.length) return;
  await db.delete(orders).where(and(eq(orders.establishmentId, establishmentId), inArray(orders.id, ids)));
  refresh();
}
