export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

/** "18,50" | "18.5" | "R$ 18,50" -> 1850 */
export function parsePriceToCents(raw: string | null | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) return 0;
  // Se tiver vírgula, ela é o separador decimal (formato brasileiro)
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 100);
}

/** 1850 -> "18,50" (para campos de formulário) */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Formata um telefone brasileiro para exibição: (11) 99999-9999 */
export function formatPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export const CATEGORY_SLUGS = {
  proteinas: "protein",
  acompanhamentos: "side",
  adicionais: "extra",
  bebidas: "drink",
} as const;

export type CategorySlug = keyof typeof CATEGORY_SLUGS;

export const CATEGORY_INFO: Record<
  CategorySlug,
  { emoji: string; plural: string; singular: string; priceLabel: string; priceHint: string }
> = {
  proteinas: {
    emoji: "🍗",
    plural: "Proteínas",
    singular: "proteína",
    priceLabel: "Acréscimo (opcional)",
    priceHint:
      "Cobrado a mais quando o cliente escolhe esta proteína em uma refeição. Deixe 0,00 se não houver acréscimo. O preço da refeição fica em Refeições.",
  },
  acompanhamentos: {
    emoji: "🍚",
    plural: "Acompanhamentos",
    singular: "acompanhamento",
    priceLabel: "Acréscimo (opcional)",
    priceHint: "Deixe 0,00 se já está incluso no valor da refeição.",
  },
  adicionais: {
    emoji: "🥚",
    plural: "Adicionais",
    singular: "adicional",
    priceLabel: "Preço do adicional",
    priceHint: "Valor cobrado a mais por este adicional.",
  },
  bebidas: {
    emoji: "🥤",
    plural: "Bebidas",
    singular: "bebida",
    priceLabel: "Preço da bebida",
    priceHint: "Valor cobrado pela bebida.",
  },
};

/**
 * Normaliza um número de WhatsApp para o formato internacional (só dígitos).
 * "(21) 99999-9999" -> "5521999999999" · "+55 21 99999-9999" -> "5521999999999"
 */
export function normalizeWhatsApp(raw: string): string {
  let digits = onlyDigits(raw);
  // Remove o zero de operadora ("021 ...")
  if (digits.length === 11 || digits.length === 12) {
    if (digits.startsWith("0")) digits = digits.slice(1);
  }
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits;
}

/**
 * Um número de WhatsApp (já normalizado ou não) é válido para receber pedidos?
 * Brasil: 55 + DDD (11–99, sem terminar em 0) + 8 ou 9 dígitos (celular começa com 9).
 * Outros países: 10 a 15 dígitos (padrão internacional).
 */
export function isValidWhatsApp(raw: string): boolean {
  const d = normalizeWhatsApp(raw);
  if (d.length < 10 || d.length > 15) return false;
  if (/^(\d)\1+$/.test(d)) return false; // todos os dígitos iguais
  if (d.startsWith("55")) {
    const local = d.slice(2);
    if (local.length !== 10 && local.length !== 11) return false;
    const ddd = Number(local.slice(0, 2));
    if (ddd < 11 || ddd > 99 || ddd % 10 === 0) return false;
    if (local.length === 11 && local[2] !== "9") return false;
  }
  return true;
}

/** "5521999999999" -> "+55 (21) 99999-9999" */
export function formatWhatsAppDisplay(digits: string): string {
  const d = onlyDigits(digits);
  if (!d) return "";
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) {
    return `+55 ${formatPhone(d.slice(2))}`;
  }
  return `+${d}`;
}

export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "pedido",
  "icons",
  "images",
  "sw.js",
  "_next",
  "favicon.ico",
  "icon.png",
  "apple-icon.png",
  "admin-manifest.webmanifest",
  "robots.txt",
  "manifest.json",
]);

/** "Sabor de Casa" -> "sabor-de-casa" */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 3 && slug.length <= 40 && !RESERVED_SLUGS.has(slug);
}

/** Um emoji ilustrativo a partir do nome do item (usado no resumo e na revisão). */
export function emojiFor(name: string, fallback = "🍴"): string {
  const n = name.toLowerCase();
  const table: [RegExp, string][] = [
    [/arroz/, "🍚"],
    [/feij/, "🫘"],
    [/salada|alface|legume/, "🥗"],
    [/farofa/, "🥣"],
    [/macarr|espaguete|massa/, "🍝"],
    [/pur[eê]|batata doce/, "🥔"],
    [/batata/, "🍟"],
    [/ovo/, "🥚"],
    [/bacon/, "🥓"],
    [/queijo/, "🧀"],
    [/suco|laranja|lim[aã]o/, "🧃"],
    [/[aá]gua/, "💧"],
    [/coca|guaran|refri|soda|fanta|sprite/, "🥤"],
    [/frango|galinha/, "🍗"],
    [/peixe|til[aá]pia|salm/, "🐟"],
    [/carne|bife|boi|acebolad|picanha|costela/, "🥩"],
    [/porco|lombo|lingui/, "🍖"],
    [/marmita|prato|executivo|refei/, "🍱"],
  ];
  for (const [re, emoji] of table) if (re.test(n)) return emoji;
  return fallback;
}

export function slugForCategory(category: string): CategorySlug {
  const entry = (Object.entries(CATEGORY_SLUGS) as [CategorySlug, string][]).find(
    ([, c]) => c === category,
  );
  return entry ? entry[0] : "proteinas";
}
