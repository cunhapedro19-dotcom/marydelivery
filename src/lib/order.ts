import type { MenuItem, PublicMeal } from "@/db/schema";
import type { MenuData, MealLine, OrderSelection } from "./order-types";

/* ---------- Tipos internais ---------- */

export type MealSub = "protein" | "sides" | "extras" | "note";

export type ResolvedLine = {
  key: string;
  meal: PublicMeal;
  protein: MenuItem | null;
  included: MenuItem[];
  chosen: MenuItem[];
  extras: MenuItem[];
  note: string;
  price: number;
  done: boolean;
};

export type ResolvedOrder = {
  lines: ResolvedLine[];
  drinks: { item: MenuItem; qty: number }[];
  subtotal: number;
  runningSubtotal: number;
  receiving: { mode: string; label: string; emoji: string; description: string; needsAddress: boolean } | null;
  payment: { id: number; name: string; asksChange: boolean } | null;
  note: string;
  groups: { keys: string[]; line: ResolvedLine; qty: number }[];
};

/* ---------- Helpers de seleção ---------- */

export function emptySelection(): OrderSelection {
  return {
    lines: [],
    drinkQty: {},
    note: "",
    receivingMode: null,
    customer: { name: "", phone: "", street: "", number: "", complement: "", neighborhood: "", reference: "", deliveryNote: "" },
    paymentMethodId: null,
    needsChange: null,
    changeFor: "",
  };
}

export function newLineKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ---------- Resolução de linhas ---------- */

export function resolveLine(menu: MenuData, line: MealLine): ResolvedLine {
  const meal = menu.meals.find((m) => m.id === line.mealId)!;
  const protein = line.proteinId ? menu.proteins.find((p) => p.id === line.proteinId) ?? null : null;
  const included = meal.included;
  const chosen = line.sideIds.map((id) => menu.choices.find((c) => c.id === id)).filter(Boolean) as MenuItem[];
  const extras = line.extraIds.map((id) => menu.extras.find((e) => e.id === id)).filter(Boolean) as MenuItem[];
  const price = meal.priceCents + (protein?.priceCents ?? 0) + chosen.reduce((s, c) => s + c.priceCents, 0) + extras.reduce((s, e) => s + e.priceCents, 0);
  return { key: line.key, meal, protein, included, chosen, extras, note: line.note, price, done: line.done };
}

export function resolveOrder(menu: MenuData, sel: OrderSelection): ResolvedOrder {
  const lines = sel.lines.filter((l) => l.done).map((l) => resolveLine(menu, l));
  const drinks = Object.entries(sel.drinkQty)
    .map(([id, qty]) => ({ item: menu.drinks.find((d) => d.id === Number(id))!, qty }))
    .filter((d) => d.item);
  const subtotal = lines.reduce((s, l) => s + l.price, 0) + drinks.reduce((s, d) => s + d.item.priceCents * d.qty, 0);
  const runningSubtotal = sel.lines.reduce((s, l) => s + (l.done ? resolveLine(menu, l).price : 0), 0) + drinks.reduce((s, d) => s + d.item.priceCents * d.qty, 0);

  const receivingMode = sel.receivingMode;
  const receiving = receivingMode
    ? availableReceivingModes(menu.config).find((m) => m.mode === receivingMode) ?? null
    : null;

  const payment = sel.paymentMethodId ? menu.payments.find((p) => p.id === sel.paymentMethodId) ?? null : null;

  // Agrupa linhas idênticas para o resumo
  const groupMap = new Map<string, { keys: string[]; line: ResolvedLine }>();
  for (const l of lines) {
    const sig = `${l.meal.id}-${l.protein?.id ?? "none"}-${l.chosen.map((c) => c.id).sort().join(",")}-${l.extras.map((e) => e.id).sort().join(",")}-${l.note}`;
    const existing = groupMap.get(sig);
    if (existing) existing.keys.push(l.key);
    else groupMap.set(sig, { keys: [l.key], line: l });
  }
  const groups = Array.from(groupMap.values()).map((g) => ({ keys: g.keys, line: g.line, qty: g.keys.length }));

  return {
    lines,
    drinks,
    subtotal,
    runningSubtotal,
    receiving,
    payment,
    note: sel.note,
    groups,
  };
}

/* ---------- Modalidades de recebimento ---------- */

export type ReceivingOption = {
  mode: "pickup" | "own" | "app";
  label: string;
  emoji: string;
  description: string;
  needsAddress: boolean;
};

export function availableReceivingModes(config: { pickupEnabled: boolean; pickupAddress: string; pickupHours: string; ownDeliveryEnabled: boolean; appDeliveryEnabled: boolean; appDeliveryService: string }): ReceivingOption[] {
  const opts: ReceivingOption[] = [];
  if (config.pickupEnabled) {
    opts.push({
      mode: "pickup",
      label: "Retirar no local",
      emoji: "🏪",
      description: config.pickupAddress || "Endereço a combinar",
      needsAddress: false,
    });
  }
  if (config.ownDeliveryEnabled) {
    opts.push({
      mode: "own",
      label: "Entrega própria",
      emoji: "🛵",
      description: "Valor combinado pelo WhatsApp",
      needsAddress: true,
    });
  }
  if (config.appDeliveryEnabled && config.appDeliveryService) {
    opts.push({
      mode: "app",
      label: `Entrega pelo ${config.appDeliveryService}`,
      emoji: "📱",
      description: "Pedidos direto pelo app",
      needsAddress: true,
    });
  }
  return opts;
}

export function canReceiveOrders(config: { acceptingOrders: boolean; whatsappNumber: string }): boolean {
  return config.acceptingOrders && config.whatsappNumber.trim().length > 0;
}

/* ---------- Etapas de montagem de um produto ---------- */

export function mealSubSteps(meal: PublicMeal, menu: MenuData): MealSub[] {
  const steps: MealSub[] = [];
  if (meal.proteins.length > 0) steps.push("protein");
  if (meal.choices.length > 0 && meal.maxChoices > 0) steps.push("sides");
  if (meal.allowExtras && menu.extras.length > 0) steps.push("extras");
  if (meal.allowNotes) steps.push("note");
  return steps;
}

/* ---------- Construção da mensagem WhatsApp ---------- */

export function buildWhatsAppMessage(menu: MenuData, sel: OrderSelection): string {
  const order = resolveOrder(menu, sel);
  const config = menu.config;
  const lines: string[] = [];

  lines.push(`*${config.name}*`);
  lines.push(config.whatsappGreeting || "Olá! Gostaria de fazer um pedido.");
  lines.push("");

  // Itens agrupados
  for (const g of order.groups) {
    const l = g.line;
    const qtyPrefix = g.qty > 1 ? `${g.qty}x ` : "";
    lines.push(`${qtyPrefix}${l.meal.name}`);
    if (l.protein) lines.push(`  • Proteína: ${l.protein.name}${l.protein.priceCents ? ` + ${formatBRL(l.protein.priceCents)}` : ""}`);
    if (l.included.length) lines.push(`  • Inclusos: ${l.included.map((i) => i.name).join(", ")}`);
    if (l.chosen.length) lines.push(`  • Escolhidos: ${l.chosen.map((i) => i.name).join(", ")}`);
    if (l.extras.length) lines.push(`  • Adicionais: ${l.extras.map((e) => `${e.name} + ${formatBRL(e.priceCents)}`).join(", ")}`);
    if (l.note) lines.push(`  • Obs: ${l.note}`);
    lines.push("");
  }

  // Bebidas
  if (order.drinks.length) {
    lines.push("🥤 *Bebidas*");
    for (const d of order.drinks) {
      lines.push(`${d.qty}x ${d.item.name} ${formatBRL(d.item.priceCents * d.qty)}`);
    }
    lines.push("");
  }

  if (order.note) {
    lines.push(`📝 *Obs do pedido:* ${order.note}`);
    lines.push("");
  }

  lines.push(`*Subtotal: ${formatBRL(order.subtotal)}*`);
  if (order.receiving?.needsAddress) {
    lines.push("🛵 Taxa de entrega: a combinar pelo WhatsApp");
  } else if (order.receiving?.mode === "pickup") {
    lines.push("🏪 Retirada no local · sem taxa de entrega");
  }
  lines.push("");

  if (order.receiving?.needsAddress) {
    lines.push("📍 *Endereço de entrega:*");
    const c = sel.customer;
    lines.push(`${c.street}, ${c.number}${c.complement ? ` — ${c.complement}` : ""}`);
    lines.push(`${c.neighborhood}`);
    if (c.reference) lines.push(`Ref: ${c.reference}`);
    if (c.deliveryNote) lines.push(`Obs: ${c.deliveryNote}`);
    lines.push("");
  } else if (order.receiving?.mode === "pickup") {
    lines.push("🏪 *Retirada no local*");
    if (config.pickupAddress) lines.push(config.pickupAddress);
    if (config.pickupHours) lines.push(config.pickupHours);
    lines.push("");
  }

  lines.push(`👤 ${sel.customer.name}`);
  lines.push(`📞 ${sel.customer.phone}`);
  if (order.payment) {
    lines.push(`💳 ${order.payment.name}${order.payment.asksChange && sel.needsChange ? ` (troco para ${formatBRL(parsePriceToCents(sel.changeFor) || 0)})` : ""}`);
  }

  return lines.join("\n");
}

function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function parsePriceToCents(text: string): number | null {
  const cleaned = text.replace(/[^\d.,]/g, "").replace(",", ".");
  const num = Number(cleaned);
  return Number.isFinite(num) ? Math.round(num * 100) : null;
}

/* ---------- Link do WhatsApp ---------- */

export function whatsappUrl(number: string, message: string): string {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/* ---------- Troco ---------- */

export function changeForLabel(changeFor: string): string {
  const cents = parsePriceToCents(changeFor);
  return cents ? formatBRL(cents) : "valor não informado";
}