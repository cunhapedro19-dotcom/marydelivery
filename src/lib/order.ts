import type { Establishment, Meal, MenuItem, PaymentMethod, ReceivingMode } from "@/db/schema";
import { formatBRL, formatPhone, isValidWhatsApp, normalizeWhatsApp } from "@/lib/format";

/**
 * O cardápio só recebe pedidos quando está aberto E tem um WhatsApp válido cadastrado —
 * sem número não há para onde enviar o pedido.
 */
export function canReceiveOrders(config: Pick<Establishment, "acceptingOrders" | "whatsappNumber">): boolean {
  return config.acceptingOrders && isValidWhatsApp(config.whatsappNumber);
}

/** Mensagem usada pelo botão "Testar WhatsApp" do painel. */
export const WHATSAPP_TEST_MESSAGE = "Olá! Esta é uma mensagem de teste do meu cardápio digital.";

/** Produto com sua composição (somente itens disponíveis, no cardápio público). */
export type PublicMeal = Meal & {
  included: MenuItem[];
  proteins: MenuItem[];
  choices: MenuItem[];
};

export type MenuData = {
  config: Establishment;
  meals: PublicMeal[];
  extras: MenuItem[];
  drinks: MenuItem[];
  payments: PaymentMethod[];
};

export type Customer = {
  name: string;
  phone: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  reference: string;
  deliveryNote: string;
};

/** Um produto dentro do pedido (o cliente pode pedir vários, cada um com suas escolhas). */
export type MealLine = {
  key: string;
  mealId: number;
  proteinId: number | null;
  sideIds: number[];
  extraIds: number[];
  note: string;
  /** false enquanto o cliente ainda está montando */
  done: boolean;
};

export type OrderSelection = {
  lines: MealLine[];
  /** id da bebida -> quantidade */
  drinkQty: Record<string, number>;
  /** observação geral do pedido */
  note: string;
  receivingMode: ReceivingMode | null;
  customer: Customer;
  paymentMethodId: number | null;
  needsChange: boolean | null;
  changeFor: string;
};

export const emptySelection: OrderSelection = {
  lines: [],
  drinkQty: {},
  note: "",
  receivingMode: null,
  customer: {
    name: "",
    phone: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    reference: "",
    deliveryNote: "",
  },
  paymentMethodId: null,
  needsChange: null,
  changeFor: "",
};

export function newLineKey(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/* ---------- Modalidades de recebimento ---------- */

export type ReceivingInfo = {
  mode: ReceivingMode;
  emoji: string;
  label: string;
  description: string;
  needsAddress: boolean;
  /** Linha da seção "🚚 ENTREGA" na mensagem (null = não mostra a seção) */
  feeLine: string | null;
};

export function receivingInfo(config: Establishment, mode: ReceivingMode): ReceivingInfo {
  switch (mode) {
    case "pickup": {
      const parts = [config.pickupAddress && `📍 ${config.pickupAddress}`, config.pickupHours && `🕐 ${config.pickupHours}`].filter(Boolean);
      return {
        mode,
        emoji: "🏪",
        label: "Retirada no local",
        description: parts.length ? parts.join(" · ") : "Você busca o pedido no estabelecimento.",
        needsAddress: false,
        feeLine: null,
      };
    }
    case "own":
      return {
        mode,
        emoji: "🛵",
        label: "Entrega própria",
        description: "Entregamos com nossa própria equipe. A taxa é combinada pelo WhatsApp.",
        needsAddress: true,
        feeLine: "Taxa a confirmar pelo WhatsApp.",
      };
    case "app": {
      const service = config.appDeliveryService.trim() || "aplicativo";
      return {
        mode,
        emoji: "🚗",
        label: `Entrega por ${service}`,
        description: `A entrega é feita por ${service}. O valor é combinado pelo WhatsApp.`,
        needsAddress: true,
        feeLine: "Valor a confirmar pelo WhatsApp.",
      };
    }
  }
}

export function availableReceivingModes(config: Establishment): ReceivingInfo[] {
  const modes: ReceivingMode[] = [];
  if (config.pickupEnabled) modes.push("pickup");
  if (config.ownDeliveryEnabled) modes.push("own");
  if (config.appDeliveryEnabled) modes.push("app");
  return modes.map((m) => receivingInfo(config, m));
}

/* ---------- Passos de personalização de um produto ---------- */

export type MealSub = "protein" | "sides" | "extras" | "note";

export function mealSubSteps(meal: PublicMeal, menu: MenuData): MealSub[] {
  const steps: MealSub[] = [];
  if (meal.proteins.length > 0) steps.push("protein");
  if (meal.choices.length > 0 && meal.maxChoices > 0) steps.push("sides");
  if (meal.allowExtras && menu.extras.length > 0) steps.push("extras");
  if (meal.allowNotes) steps.push("note");
  return steps;
}

/* ---------- Resolução do pedido ---------- */

export type ResolvedLine = {
  key: string;
  meal: PublicMeal;
  protein: MenuItem | null;
  included: MenuItem[];
  chosen: MenuItem[];
  extras: MenuItem[];
  note: string;
  /** preço do produto + acréscimos + adicionais */
  price: number;
  done: boolean;
};

export function resolveLine(menu: MenuData, line: MealLine): ResolvedLine | null {
  const meal = menu.meals.find((m) => m.id === line.mealId);
  if (!meal) return null;
  const protein = meal.proteins.find((p) => p.id === line.proteinId) ?? null;
  const chosen = line.sideIds
    .map((id) => meal.choices.find((c) => c.id === id))
    .filter((c): c is MenuItem => !!c);
  const extras = meal.allowExtras
    ? line.extraIds.map((id) => menu.extras.find((e) => e.id === id)).filter((e): e is MenuItem => !!e)
    : [];
  const price =
    meal.priceCents +
    (protein?.priceCents ?? 0) +
    chosen.reduce((sum, c) => sum + c.priceCents, 0) +
    extras.reduce((sum, e) => sum + e.priceCents, 0);
  return {
    key: line.key,
    meal,
    protein,
    included: meal.included,
    chosen,
    extras,
    note: line.note.trim(),
    price,
    done: line.done,
  };
}

/** Linhas idênticas (mesmo produto, escolhas e observação) agrupadas como "2x". */
export type GroupedLine = { line: ResolvedLine; qty: number; keys: string[] };

export function groupLines(lines: ResolvedLine[]): GroupedLine[] {
  const groups: GroupedLine[] = [];
  const signature = (l: ResolvedLine) =>
    [
      l.meal.id,
      l.protein?.id ?? 0,
      [...l.chosen.map((c) => c.id)].sort((a, b) => a - b).join("."),
      [...l.extras.map((e) => e.id)].sort((a, b) => a - b).join("."),
      l.note.toLowerCase(),
    ].join("|");
  const index = new Map<string, GroupedLine>();
  for (const l of lines) {
    const sig = signature(l);
    const existing = index.get(sig);
    if (existing) {
      existing.qty += 1;
      existing.keys.push(l.key);
    } else {
      const g = { line: l, qty: 1, keys: [l.key] };
      index.set(sig, g);
      groups.push(g);
    }
  }
  return groups;
}

export function resolveOrder(menu: MenuData, sel: OrderSelection) {
  const allLines = sel.lines
    .map((l) => resolveLine(menu, l))
    .filter((l): l is ResolvedLine => !!l);
  const lines = allLines.filter((l) => l.done);
  const drinks = menu.drinks
    .map((item) => ({ item, qty: sel.drinkQty[String(item.id)] ?? 0 }))
    .filter((d) => d.qty > 0);
  const payment = menu.payments.find((p) => p.id === sel.paymentMethodId) ?? null;
  const drinksTotal = drinks.reduce((sum, d) => sum + d.item.priceCents * d.qty, 0);
  const subtotal = lines.reduce((sum, l) => sum + l.price, 0) + drinksTotal;
  // Inclui o produto que ainda está sendo montado (para a barra inferior)
  const runningSubtotal = allLines.reduce((sum, l) => sum + l.price, 0) + drinksTotal;
  const receiving = sel.receivingMode ? receivingInfo(menu.config, sel.receivingMode) : null;
  return {
    lines,
    groups: groupLines(lines),
    drinks,
    payment,
    receiving,
    subtotal,
    runningSubtotal,
    note: sel.note.trim(),
  };
}

export type ResolvedOrder = ReturnType<typeof resolveOrder>;

/** Texto do troco como aparece para o estabelecimento (ex.: "R$ 50,00"). */
export function changeForLabel(raw: string): string {
  const value = raw.trim();
  return value.startsWith("R$") ? value : `R$ ${value}`;
}

function plusPrice(item: MenuItem): string {
  return item.priceCents > 0 ? ` (+ ${formatBRL(item.priceCents)})` : "";
}

/** Resumo curto de uma linha (usado no registro de pedidos do painel). */
export function orderSummary(o: ResolvedOrder): string {
  const parts = o.groups.map((g) => `${g.qty}x ${g.line.meal.name}`);
  o.drinks.forEach((d) => parts.push(`${d.qty}x ${d.item.name}`));
  return parts.join(", ");
}

/* ---------- Mensagem do WhatsApp ---------- */

export function buildWhatsAppMessage(menu: MenuData, sel: OrderSelection): string {
  const { config } = menu;
  const o = resolveOrder(menu, sel);
  const c = sel.customer;
  const lines: string[] = [];

  if (config.whatsappGreeting.trim()) lines.push(config.whatsappGreeting.trim(), "");
  lines.push(`${config.emoji} NOVO PEDIDO`, "");

  o.groups.forEach((g) => {
    const l = g.line;
    lines.push(`${g.qty}x ${l.meal.name} — ${formatBRL(l.meal.priceCents * g.qty)}`);
    if (l.protein) lines.push("Proteína:", `- ${l.protein.name}${plusPrice(l.protein)}`);
    if (l.included.length) {
      lines.push("Inclusos:");
      l.included.forEach((i) => lines.push(`- ${i.name}`));
    }
    if (l.chosen.length) {
      lines.push("Escolhidos:");
      l.chosen.forEach((i) => lines.push(`- ${i.name}${plusPrice(i)}`));
    }
    if (l.extras.length) {
      lines.push(l.extras.length === 1 ? "Adicional:" : "Adicionais:");
      l.extras.forEach((e) => lines.push(`- ${e.name} — ${formatBRL(e.priceCents)}${g.qty > 1 ? " (cada)" : ""}`));
    }
    if (l.note) lines.push("📝 Observação:", l.note);
    lines.push("");
  });

  if (o.drinks.length) {
    lines.push(o.drinks.length === 1 && o.drinks[0].qty === 1 ? "Bebida:" : "Bebidas:");
    o.drinks.forEach((d) => lines.push(`- ${d.qty}x ${d.item.name} — ${formatBRL(d.item.priceCents * d.qty)}`));
    lines.push("");
  }

  if (o.note) lines.push("📝 Observação do pedido:", o.note, "");

  const r = o.receiving;
  if (r) {
    lines.push(`${r.emoji} RECEBIMENTO`, r.label);
    if (r.mode === "pickup") {
      lines.push(`Nome: ${c.name.trim()}`);
      if (c.phone.trim()) lines.push(`Telefone: ${formatPhone(c.phone)}`);
    }
    lines.push("");
    if (r.needsAddress) {
      lines.push("📍 ENDEREÇO");
      lines.push(`${c.name.trim()}${c.phone.trim() ? ` · ${formatPhone(c.phone)}` : ""}`);
      lines.push(`${c.street.trim()}, ${c.number.trim()}`);
      if (c.neighborhood.trim()) lines.push(c.neighborhood.trim());
      if (c.complement.trim()) lines.push(`Complemento: ${c.complement.trim()}`);
      if (c.reference.trim()) lines.push(`Referência: ${c.reference.trim()}`);
      if (c.deliveryNote.trim()) lines.push(`Obs. da entrega: ${c.deliveryNote.trim()}`);
      lines.push("");
    }
  }

  lines.push("💳 PAGAMENTO", o.payment?.name ?? "-");
  if (o.payment?.asksChange) {
    lines.push(sel.needsChange && sel.changeFor.trim() ? `Troco para ${changeForLabel(sel.changeFor)}` : "Não precisa de troco");
  }
  lines.push("");

  lines.push("💰 SUBTOTAL", formatBRL(o.subtotal));
  if (r?.feeLine) lines.push("", "🚚 ENTREGA", r.feeLine);

  return lines.join("\n");
}

/** Link que abre a conversa com o número do estabelecimento já com a mensagem preenchida (o cliente toca em enviar). */
export function whatsappUrl(number: string, message: string): string {
  const digits = normalizeWhatsApp(number);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
