import {
  boolean,
  customType,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export type ItemCategory = "protein" | "side" | "extra" | "drink";

/** Papel de um item dentro de um produto/refeição. */
export type MealRole = "included" | "protein" | "choice";

/** Como o cliente recebe o pedido. */
export type ReceivingMode = "pickup" | "own" | "app";

/**
 * Estabelecimentos. Cada negócio (marmitaria, hamburgueria, pizzaria...) tem a sua linha aqui
 * e todos os seus dados (produtos, pagamentos, pedidos, usuários) apontam para ela.
 */
export const establishments = pgTable("establishments", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull().default("Meu Cardápio"),
  emoji: text("emoji").notNull().default("🍲"),
  description: text("description").notNull().default(""),
  logoUrl: text("logo_url"),
  heroUrl: text("hero_url"),
  // WhatsApp que recebe os pedidos (guardado no formato internacional, só dígitos: 5521999999999)
  whatsappNumber: text("whatsapp_number").notNull().default(""),
  whatsappGreeting: text("whatsapp_greeting")
    .notNull()
    .default("Olá! Gostaria de fazer um pedido pelo cardápio."),
  openingHours: text("opening_hours").notNull().default(""),
  openingDays: text("opening_days").notNull().default(""),
  acceptingOrders: boolean("accepting_orders").notNull().default(true),
  pausedMessage: text("paused_message").notNull().default(""),
  drinkRequired: boolean("drink_required").notNull().default(false),
  // Modalidades de recebimento (o valor da entrega nunca é calculado aqui)
  pickupEnabled: boolean("pickup_enabled").notNull().default(true),
  pickupAddress: text("pickup_address").notNull().default(""),
  pickupHours: text("pickup_hours").notNull().default(""),
  ownDeliveryEnabled: boolean("own_delivery_enabled").notNull().default(true),
  appDeliveryEnabled: boolean("app_delivery_enabled").notNull().default(false),
  appDeliveryService: text("app_delivery_service").notNull().default(""),
  deliveryAreas: text("delivery_areas").notNull().default(""),
  deliveryNotes: text("delivery_notes").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Itens (ingredientes) do cardápio: proteínas, acompanhamentos, adicionais e bebidas
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  establishmentId: integer("establishment_id")
    .notNull()
    .references(() => establishments.id, { onDelete: "cascade" }),
  category: text("category").$type<ItemCategory>().notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  priceCents: integer("price_cents").notNull().default(0),
  imageUrl: text("image_url"),
  available: boolean("available").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Produtos (refeições, lanches, porções...). Cada um tem sua própria composição.
export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  establishmentId: integer("establishment_id")
    .notNull()
    .references(() => establishments.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull().default(""),
  description: text("description").notNull().default(""),
  priceCents: integer("price_cents").notNull().default(0),
  imageUrl: text("image_url"),
  available: boolean("available").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  // Quantos acompanhamentos opcionais o cliente pode escolher
  maxChoices: integer("max_choices").notNull().default(2),
  allowExtras: boolean("allow_extras").notNull().default(true),
  allowNotes: boolean("allow_notes").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Composição de cada produto: o que já vem incluso, proteínas à escolha e acompanhamentos opcionais
export const mealItems = pgTable(
  "meal_items",
  {
    mealId: integer("meal_id")
      .notNull()
      .references(() => meals.id, { onDelete: "cascade" }),
    itemId: integer("item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    role: text("role").$type<MealRole>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.mealId, t.itemId] })],
);

export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  establishmentId: integer("establishment_id")
    .notNull()
    .references(() => establishments.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  asksChange: boolean("asks_change").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Pedidos iniciados pelo cardápio (registrados quando o cliente toca em "Enviar pelo WhatsApp")
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  establishmentId: integer("establishment_id")
    .notNull()
    .references(() => establishments.id, { onDelete: "cascade" }),
  customerName: text("customer_name").notNull().default(""),
  customerPhone: text("customer_phone").notNull().default(""),
  receivingMode: text("receiving_mode").$type<ReceivingMode>().notNull(),
  paymentName: text("payment_name").notNull().default(""),
  subtotalCents: integer("subtotal_cents").notNull().default(0),
  summary: text("summary").notNull().default(""),
  message: text("message").notNull().default(""),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Acesso ao painel: nome de usuário (obrigatório) + e-mail (opcional, cadastra depois no painel)
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  establishmentId: integer("establishment_id")
    .notNull()
    .references(() => establishments.id, { onDelete: "cascade" }),
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => adminUsers.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Fotos enviadas pelo painel
export const images = pgTable("images", {
  id: text("id").primaryKey(),
  establishmentId: integer("establishment_id").references(() => establishments.id, {
    onDelete: "set null",
  }),
  mimeType: text("mime_type").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Establishment = typeof establishments.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type Meal = typeof meals.$inferSelect;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type Order = typeof orders.$inferSelect;
