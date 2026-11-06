/* ---------- Formatação de moeda ---------- */

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function parsePriceToCents(text: string): number | null {
  const cleaned = text.replace(/[^\d.,]/g, "").replace(",", ".");
  const num = Number(cleaned);
  return Number.isFinite(num) ? Math.round(num * 100) : null;
}

/* ---------- Emojis por nome (fallback) ---------- */

const emojiMap: Record<string, string> = {
  // Carnes/Proteínas
  grelhado: "🥩",
  frango: "🍗",
  "frango à milanesa": "🍗",
  linguiça: "🌭",
  fígado: "🥩",
  carré: "🥩",
  parmegiana: "🍝",
  bife: "🥩",
  peixe: "🐟",
  contrafilé: "🥩",
  // Acompanhamentos
  arroz: "🍚",
  feijão: "🫘",
  farofa: "🍚",
  couve: "🥬",
  fritas: "🍟",
  salada: "🥗",
  // Bebidas
  coca: "🥤",
  água: "💧",
  guaraná: "🥤",
  fanta: "🥤",
  guaraviton: "🥤",
  guaravita: "🥤",
  h2oh: "💧",
  limoneto: "🍋",
  suco: "🧃",
  maracujá: "🧃",
  morango: "🧃",
  acerola: "🧃",
  laranja: "🧃",
  abacaxi: "🧃",
  manga: "🧃",
  goiaba: "🧃",
  // Genéricos
  box: "📦",
  combo: "🍔🍟🥤",
  porção: "🍟",
};

export function emojiFor(name: string, fallback = "🍽️"): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (lower.includes(key)) return emoji;
  }
  return fallback;
}

/* ---------- Telefone ---------- */

export function onlyDigits(text: string): string {
  return text.replace(/\D/g, "");
}

export function formatPhone(text: string): string {
  const digits = onlyDigits(text);
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return text; // devolve como veio se não bater
}

export function isValidWhatsApp(number: string): boolean {
  const digits = onlyDigits(number);
  // WhatsApp BR: 55 + DDD (2 dígitos) + 9 + 8 dígitos = 13 dígitos
  // (alguns DDDs ainda usam 8 dígitos sem o 9, aceitamos 12 ou 13)
  return digits.length === 12 || digits.length === 13;
}

/* ---------- Slug ---------- */

export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}