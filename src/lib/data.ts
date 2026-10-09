import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  establishments,
  mealItems,
  meals,
  menuItems,
  orders,
  paymentMethods,
  type Establishment,
  type ItemCategory,
  type MealRole,
} from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { requireAdmin, type AdminSession } from "@/lib/auth";
import type { PublicMeal } from "@/lib/order";

/* ---------- Estabelecimentos ---------- */

export async function getEstablishmentBySlug(slug: string): Promise<Establishment | null> {
  await ensureSeeded();
  const rows = await db.select().from(establishments).where(eq(establishments.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getEstablishmentById(id: number): Promise<Establishment | null> {
  const rows = await db.select().from(establishments).where(eq(establishments.id, id)).limit(1);
  return rows[0] ?? null;
}

/** Estabelecimento aberto quando alguém acessa a raiz do site (o mais antigo, ou o definido por variável de ambiente). */
export async function getDefaultEstablishment(): Promise<Establishment | null> {
  await ensureSeeded();
  const preferred = process.env.DEFAULT_ESTABLISHMENT_SLUG;
  if (preferred) {
    const found = await getEstablishmentBySlug(preferred);
    if (found) return found;
  }
  const rows = await db.select().from(establishments).orderBy(asc(establishments.id)).limit(1);
  return rows[0] ?? null;
}

/** Sessão + estabelecimento da pessoa logada (uso exclusivo do painel). */
export async function requireCurrentEstablishment(): Promise<{ session: AdminSession; est: Establishment }> {
  const session = await requireAdmin();
  const est = await getEstablishmentById(session.establishmentId);
  if (!est) notFound();
  return { session, est };
}

/* ---------- Itens ---------- */

export async function getItems(establishmentId: number, category: ItemCategory, onlyAvailable = false) {
  const conditions = [eq(menuItems.establishmentId, establishmentId), eq(menuItems.category, category)];
  if (onlyAvailable) conditions.push(eq(menuItems.available, true));
  return db
    .select()
    .from(menuItems)
    .where(and(...conditions))
    .orderBy(asc(menuItems.sortOrder), asc(menuItems.id));
}

export async function getItem(establishmentId: number, id: number) {
  const rows = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.id, id), eq(menuItems.establishmentId, establishmentId)))
    .limit(1);
  return rows[0] ?? null;
}

/* ---------- Formas de pagamento ---------- */

export async function getPaymentMethods(establishmentId: number, onlyActive = false) {
  const conditions = [eq(paymentMethods.establishmentId, establishmentId)];
  if (onlyActive) conditions.push(eq(paymentMethods.active, true));
  return db
    .select()
    .from(paymentMethods)
    .where(and(...conditions))
    .orderBy(asc(paymentMethods.sortOrder), asc(paymentMethods.id));
}

/* ---------- Produtos e composição ---------- */

export async function getMealsWithComposition(establishmentId: number, onlyAvailable = false): Promise<PublicMeal[]> {
  const mealConditions = [eq(meals.establishmentId, establishmentId)];
  if (onlyAvailable) mealConditions.push(eq(meals.available, true));
  const linkConditions = [eq(menuItems.establishmentId, establishmentId)];
  if (onlyAvailable) linkConditions.push(eq(menuItems.available, true));

  const [mealRows, links] = await Promise.all([
    db
      .select()
      .from(meals)
      .where(and(...mealConditions))
      .orderBy(asc(meals.sortOrder), asc(meals.id)),
    db
      .select({ mealId: mealItems.mealId, role: mealItems.role, item: menuItems })
      .from(mealItems)
      .innerJoin(menuItems, eq(menuItems.id, mealItems.itemId))
      .where(and(...linkConditions))
      .orderBy(asc(menuItems.sortOrder), asc(menuItems.id)),
  ]);

  const result: PublicMeal[] = mealRows.map((m) => ({ ...m, included: [], proteins: [], choices: [] }));
  const byId = new Map(result.map((m) => [m.id, m]));
  for (const link of links) {
    const meal = byId.get(link.mealId);
    if (!meal) continue;
    const role: MealRole = link.role;
    if (role === "included") meal.included.push(link.item);
    else if (role === "protein") meal.proteins.push(link.item);
    else meal.choices.push(link.item);
  }
  return result;
}

export async function getMeal(establishmentId: number, id: number) {
  const rows = await db
    .select()
    .from(meals)
    .where(and(eq(meals.id, id), eq(meals.establishmentId, establishmentId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Ids dos itens de um produto, separados por papel (para o formulário do painel). */
export async function getMealComposition(mealId: number) {
  const links = await db
    .select({ itemId: mealItems.itemId, role: mealItems.role })
    .from(mealItems)
    .where(eq(mealItems.mealId, mealId));
  return {
    included: links.filter((l) => l.role === "included").map((l) => l.itemId),
    proteins: links.filter((l) => l.role === "protein").map((l) => l.itemId),
    choices: links.filter((l) => l.role === "choice").map((l) => l.itemId),
  };
}

/* ---------- Pedidos registrados ---------- */

export async function getOrders(establishmentId: number, limit = 60) {
  return db
    .select()
    .from(orders)
    .where(eq(orders.establishmentId, establishmentId))
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(limit);
}

/* ---------- Cardápio público ---------- */

/** Tudo que o cardápio público de um estabelecimento precisa, somente o que está disponível. */
export async function getPublicMenu(slug: string) {
  const config = await getEstablishmentBySlug(slug);
  if (!config) return null;
  const [mealList, extras, drinks, payments] = await Promise.all([
    getMealsWithComposition(config.id, true),
    getItems(config.id, "extra", true),
    getItems(config.id, "drink", true),
    getPaymentMethods(config.id, true),
  ]);
  return { config, meals: mealList, extras, drinks, payments };
}

export type PublicMenu = NonNullable<Awaited<ReturnType<typeof getPublicMenu>>>;
