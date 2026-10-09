"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { MenuItem, ReceivingMode } from "@/db/schema";
import { emojiFor, formatBRL, formatPhone, isValidWhatsApp, onlyDigits, parsePriceToCents } from "@/lib/format";
import {
  availableReceivingModes,
  buildWhatsAppMessage,
  changeForLabel,
  emptySelection,
  mealSubSteps,
  newLineKey,
  orderSummary,
  resolveLine,
  resolveOrder,
  whatsappUrl,
  type MealLine,
  type MealSub,
  type MenuData,
  type OrderSelection,
  type PublicMeal,
  type ResolvedLine,
} from "@/lib/order";

type Sub = "meal" | MealSub;
type Phase = "builder" | "cart" | "drinks" | "receiving" | "contact" | "payment" | "notes" | "review";
type View = { phase: "builder"; sub: Sub; lineKey: string } | { phase: Exclude<Phase, "builder"> };

const PHASES: Phase[] = ["builder", "cart", "drinks", "receiving", "contact", "payment", "notes", "review"];
const PHASE_LABELS: Record<Phase, string> = {
  builder: "Produto",
  cart: "Seu pedido",
  drinks: "Bebida",
  receiving: "Recebimento",
  contact: "Seus dados",
  payment: "Pagamento",
  notes: "Observações",
  review: "Confirmar",
};
const NOTE_SUGGESTIONS = ["Sem cebola", "Sem feijão", "Sem salada", "Pouco sal", "Molho separado", "Sem pimenta", "Bem passado"];

type Persisted = { sel: OrderSelection; view: View };

function sanitize(menu: MenuData, raw: Partial<OrderSelection> | undefined): OrderSelection {
  const lines: MealLine[] = [];
  for (const l of raw?.lines ?? []) {
    const meal = menu.meals.find((m) => m.id === l.mealId);
    if (!meal) continue;
    const proteinId = meal.proteins.some((p) => p.id === l.proteinId) ? l.proteinId : null;
    const sideIds = (l.sideIds ?? []).filter((id) => meal.choices.some((c) => c.id === id)).slice(0, meal.maxChoices);
    const extraIds = meal.allowExtras ? (l.extraIds ?? []).filter((id) => menu.extras.some((e) => e.id === id)) : [];
    const done = !!l.done && (meal.proteins.length === 0 || proteinId !== null);
    lines.push({ key: l.key || newLineKey(), mealId: meal.id, proteinId, sideIds, extraIds, note: meal.allowNotes ? String(l.note ?? "") : "", done });
  }
  const drinkQty: Record<string, number> = {};
  for (const d of menu.drinks) {
    const q = Math.floor(Number(raw?.drinkQty?.[String(d.id)] ?? 0));
    if (q > 0) drinkQty[String(d.id)] = Math.min(q, 20);
  }
  const modes = availableReceivingModes(menu.config).map((m) => m.mode);
  const receivingMode = raw?.receivingMode && modes.includes(raw.receivingMode) ? raw.receivingMode : null;
  return {
    lines,
    drinkQty,
    note: String(raw?.note ?? ""),
    receivingMode,
    customer: { ...emptySelection.customer, ...(raw?.customer ?? {}) },
    paymentMethodId: menu.payments.some((p) => p.id === raw?.paymentMethodId) ? (raw?.paymentMethodId ?? null) : null,
    needsChange: raw?.needsChange ?? null,
    changeFor: String(raw?.changeFor ?? ""),
  };
}

function subsFor(meal: PublicMeal, menu: MenuData): Sub[] {
  return ["meal", ...mealSubSteps(meal, menu)];
}

export default function OrderBuilder({ menu }: { menu: MenuData }) {
  const { config } = menu;
  const storageKey = `pedido-${config.slug}-v4`;
  const receivingOptions = useMemo(() => availableReceivingModes(config), [config]);

  const [sel, setSel] = useState<OrderSelection>(emptySelection);
  const [view, setView] = useState<View>(() => ({ phase: "builder", sub: "meal", lineKey: newLineKey() }));
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitNotice, setLimitNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loggedMessage = useRef<string | null>(null);

  const order = useMemo(() => resolveOrder(menu, sel), [menu, sel]);
  const doneLines = order.lines;
  const receiving = order.receiving;

  const currentLine = view.phase === "builder" ? (sel.lines.find((l) => l.key === view.lineKey) ?? null) : null;
  const currentMeal = currentLine ? (menu.meals.find((m) => m.id === currentLine.mealId) ?? null) : null;
  const currentResolved = currentLine ? resolveLine(menu, currentLine) : null;
  const currentSubs = currentMeal ? subsFor(currentMeal, menu) : (["meal"] as Sub[]);

  /* ---------- Persistência (sobrevive a um recarregamento) ---------- */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Persisted>;
        const cleanSel = sanitize(menu, saved.sel);
        setSel(cleanSel);
        const v = saved.view;
        let restored: View | null = null;
        if (v && v.phase === "builder") {
          const line = cleanSel.lines.find((l) => l.key === v.lineKey);
          if (line) {
            const meal = menu.meals.find((m) => m.id === line.mealId)!;
            restored = { phase: "builder", lineKey: line.key, sub: subsFor(meal, menu).includes(v.sub) ? v.sub : "meal" };
          } else if (v.sub === "meal") {
            restored = { phase: "builder", sub: "meal", lineKey: v.lineKey || newLineKey() };
          }
        } else if (v && PHASES.includes(v.phase)) {
          restored = cleanSel.lines.some((l) => l.done) ? v : null;
        }
        if (restored) setView(restored);
        else if (cleanSel.lines.some((l) => l.done)) setView({ phase: "cart" });
      }
    } catch {
      /* ignora */
    }
    setHydrated(true);
  }, [menu, storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem(storageKey, JSON.stringify({ sel, view } satisfies Persisted));
  }, [sel, view, hydrated, storageKey]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    setError(null);
    if (view.phase !== "builder") {
      setSel((prev) => (prev.lines.some((l) => !l.done) ? { ...prev, lines: prev.lines.filter((l) => l.done) } : prev));
    }
  }, [view]);

  // Se só existe uma forma de recebimento, já deixa escolhida
  useEffect(() => {
    if (!hydrated) return;
    if (receivingOptions.length === 1 && sel.receivingMode !== receivingOptions[0].mode) {
      setSel((prev) => ({ ...prev, receivingMode: receivingOptions[0].mode }));
    }
  }, [hydrated, receivingOptions, sel.receivingMode]);

  /* ---------- Atualizações de estado ---------- */
  function update(patch: Partial<OrderSelection>) {
    setSel((prev) => ({ ...prev, ...patch }));
    setError(null);
  }
  function updateCustomer(patch: Partial<OrderSelection["customer"]>) {
    setSel((prev) => ({ ...prev, customer: { ...prev.customer, ...patch } }));
    setError(null);
  }
  function updateLine(key: string, patch: Partial<MealLine> | ((line: MealLine) => Partial<MealLine>)) {
    setSel((prev) => ({
      ...prev,
      lines: prev.lines.map((l) => (l.key === key ? { ...l, ...(typeof patch === "function" ? patch(l) : patch) } : l)),
    }));
    setError(null);
  }
  function chooseMeal(mealId: number) {
    if (view.phase !== "builder") return;
    const key = view.lineKey;
    setSel((prev) => {
      const existing = prev.lines.find((l) => l.key === key);
      if (existing && existing.mealId === mealId) return prev;
      const fresh: MealLine = { key, mealId, proteinId: null, sideIds: [], extraIds: [], note: "", done: false };
      return { ...prev, lines: existing ? prev.lines.map((l) => (l.key === key ? fresh : l)) : [...prev.lines, fresh] };
    });
    setError(null);
  }
  function toggleSide(id: number) {
    if (!currentLine || !currentMeal) return;
    const max = currentMeal.maxChoices;
    updateLine(currentLine.key, (l) => {
      if (l.sideIds.includes(id)) return { sideIds: l.sideIds.filter((x) => x !== id) };
      if (l.sideIds.length >= max) {
        showLimit(`Você pode escolher até ${max} acompanhamento${max === 1 ? "" : "s"}.`);
        return {};
      }
      return { sideIds: [...l.sideIds, id] };
    });
  }
  function showLimit(msg: string) {
    setLimitNotice(msg);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setLimitNotice(null), 2500);
  }
  function toggleExtra(id: number) {
    if (!currentLine) return;
    updateLine(currentLine.key, (l) => ({ extraIds: l.extraIds.includes(id) ? l.extraIds.filter((x) => x !== id) : [...l.extraIds, id] }));
  }
  function appendNote(suggestion: string) {
    if (!currentLine) return;
    updateLine(currentLine.key, (l) => {
      const current = l.note.trim();
      if (current.toLowerCase().includes(suggestion.toLowerCase())) return {};
      return { note: current ? `${current.replace(/[.,\s]+$/, "")}, ${suggestion.toLowerCase()}` : suggestion };
    });
  }
  function setDrinkQty(id: number, qty: number) {
    setSel((prev) => {
      const next = { ...prev.drinkQty };
      if (qty <= 0) delete next[String(id)];
      else next[String(id)] = Math.min(qty, 20);
      return { ...prev, drinkQty: next };
    });
    setError(null);
  }

  /* ---------- Navegação ---------- */
  function startNewMeal() {
    setView({ phase: "builder", sub: "meal", lineKey: newLineKey() });
  }
  function editLine(line: ResolvedLine) {
    const subs = subsFor(line.meal, menu);
    setView({ phase: "builder", lineKey: line.key, sub: subs.length > 1 ? subs[1] : "meal" });
  }
  function duplicateLine(line: ResolvedLine) {
    setSel((prev) => {
      const idx = prev.lines.findIndex((l) => l.key === line.key);
      if (idx < 0) return prev;
      const copy: MealLine = { ...prev.lines[idx], key: newLineKey(), done: true };
      const lines = [...prev.lines];
      lines.splice(idx + 1, 0, copy);
      return { ...prev, lines };
    });
  }
  function removeLine(key: string) {
    const remaining = sel.lines.filter((l) => l.key !== key);
    setSel((prev) => ({ ...prev, lines: prev.lines.filter((l) => l.key !== key) }));
    if (!remaining.some((l) => l.done)) startNewMeal();
  }

  function previousView(): View | null {
    if (view.phase === "builder") {
      if (view.sub === "meal") return doneLines.some((l) => l.key !== view.lineKey) ? { phase: "cart" } : null;
      const idx = currentSubs.indexOf(view.sub);
      return { phase: "builder", lineKey: view.lineKey, sub: currentSubs[Math.max(idx - 1, 0)] };
    }
    if (view.phase === "cart") {
      const last = doneLines[doneLines.length - 1];
      if (!last) return null;
      const subs = subsFor(last.meal, menu);
      return { phase: "builder", lineKey: last.key, sub: subs[subs.length - 1] };
    }
    const idx = PHASES.indexOf(view.phase);
    return { phase: PHASES[idx - 1] as Exclude<Phase, "builder"> };
  }
  const prev = previousView();
  function back() {
    if (prev) setView(prev);
  }

  function validateCurrent(): string | null {
    const c = sel.customer;
    switch (view.phase) {
      case "builder":
        if (!currentLine || !currentMeal) return "Escolha um produto para continuar.";
        if (view.sub === "protein" && !currentLine.proteinId) return "Escolha a proteína para continuar.";
        return null;
      case "cart":
        return doneLines.length ? null : "Adicione pelo menos um produto.";
      case "drinks":
        return config.drinkRequired && order.drinks.length === 0 ? "Escolha uma bebida para continuar." : null;
      case "receiving":
        if (receivingOptions.length === 0) return "O estabelecimento ainda não configurou como entrega os pedidos.";
        return sel.receivingMode ? null : "Escolha como você deseja receber.";
      case "contact": {
        if (!c.name.trim()) return "Informe seu nome.";
        if (onlyDigits(c.phone).length < 10) return "Informe um telefone com DDD.";
        if (receiving?.needsAddress) {
          if (!c.street.trim()) return "Informe o endereço (rua).";
          if (!c.number.trim()) return "Informe o número.";
          if (!c.neighborhood.trim()) return "Informe o bairro.";
        }
        return null;
      }
      case "payment": {
        if (!order.payment) return "Escolha como você vai pagar.";
        if (order.payment.asksChange) {
          if (sel.needsChange === null) return "Nos diga se precisa de troco.";
          if (sel.needsChange) {
            const cents = parsePriceToCents(sel.changeFor);
            if (!cents) return "Informe para quanto precisa de troco.";
            if (cents < order.subtotal) return `O valor precisa ser pelo menos o subtotal (${formatBRL(order.subtotal)}).`;
          }
        }
        return null;
      }
      default:
        return null;
    }
  }

  function next() {
    const problem = validateCurrent();
    if (problem) {
      setError(problem);
      return;
    }
    if (view.phase === "builder" && currentLine) {
      const idx = currentSubs.indexOf(view.sub);
      if (idx >= currentSubs.length - 1) {
        updateLine(currentLine.key, { done: true });
        setView({ phase: "cart" });
      } else {
        setView({ phase: "builder", lineKey: currentLine.key, sub: currentSubs[idx + 1] });
      }
      return;
    }
    const idx = PHASES.indexOf(view.phase);
    setView({ phase: PHASES[Math.min(idx + 1, PHASES.length - 1)] as Exclude<Phase, "builder"> });
  }

  const message = useMemo(() => buildWhatsAppMessage(menu, sel), [menu, sel]);
  const waLink = whatsappUrl(config.whatsappNumber, message);

  /** Registra o pedido no painel do estabelecimento (o envio em si é feito pelo cliente, no WhatsApp). */
  function logOrder() {
    if (loggedMessage.current === message || !sel.receivingMode) return;
    loggedMessage.current = message;
    try {
      const body = JSON.stringify({
        slug: config.slug,
        customerName: sel.customer.name,
        customerPhone: sel.customer.phone,
        receivingMode: sel.receivingMode,
        paymentName: order.payment?.name ?? "",
        subtotalCents: order.subtotal,
        summary: orderSummary(order),
        message,
      });
      fetch("/api/pedidos", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    } catch {
      /* ignora */
    }
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignora */
    }
  }

  /* ---------- Textos ---------- */
  const phaseIndex = PHASES.indexOf(view.phase);
  const isLastSub = view.phase === "builder" && currentMeal !== null && currentSubs.indexOf(view.sub) === currentSubs.length - 1;
  const maxChoices = currentMeal?.maxChoices ?? 0;

  let title = "";
  if (view.phase === "builder") {
    const t: Record<Sub, string> = {
      meal: "O que você deseja?",
      protein: "Escolha a proteína",
      sides: maxChoices === 1 ? "Escolha 1 acompanhamento" : `Escolha até ${maxChoices} acompanhamentos`,
      extras: "Quer adicionar algo?",
      note: "Alguma observação?",
    };
    title = t[view.sub];
  } else {
    const t: Record<Exclude<Phase, "builder">, string> = {
      cart: "Seu pedido",
      drinks: "Escolha sua bebida",
      receiving: "Como você deseja receber?",
      contact: receiving?.needsAddress ? "Endereço de entrega" : "Quem vai retirar?",
      payment: "Como você vai pagar?",
      notes: "Alguma observação?",
      review: "Confirme seu pedido",
    };
    title = t[view.phase];
  }

  let primaryLabel = "Continuar";
  if (view.phase === "builder") {
    if (view.sub === "meal") primaryLabel = currentMeal && currentSubs.length === 1 ? "Adicionar ao pedido" : "Montar";
    else if (isLastSub) primaryLabel = currentLine?.done ? "Salvar" : "Adicionar ao pedido";
  } else if (view.phase === "cart") primaryLabel = "Escolher bebida";
  else if (view.phase === "notes") primaryLabel = "Revisar pedido";

  const lineNumber = currentLine ? sel.lines.findIndex((l) => l.key === currentLine.key) + 1 : 0;
  const sidesCount = currentLine?.sideIds.length ?? 0;
  const drinksCount = order.drinks.reduce((s, d) => s + d.qty, 0);

  // Agrupa os produtos por categoria (quando o estabelecimento usa categorias)
  const mealGroups = useMemo(() => {
    const groups: { name: string; meals: PublicMeal[] }[] = [];
    for (const m of menu.meals) {
      const name = m.category.trim();
      const g = groups.find((x) => x.name === name);
      if (g) g.meals.push(m);
      else groups.push({ name, meals: [m] });
    }
    return groups;
  }, [menu.meals]);
  const showGroupTitles = mealGroups.some((g) => g.name);

  const footerHint =
    receiving?.mode === "pickup"
      ? "Retirada no local · sem taxa de entrega"
      : receiving
        ? "Taxa de entrega: consultar pelo WhatsApp"
        : "Entrega (se houver): consultar pelo WhatsApp";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-cream-50 sm:my-6 sm:min-h-0 sm:rounded-[2rem] sm:shadow-xl">
      {/* Cabeçalho com progresso */}
      <header className="sticky top-0 z-20 border-b border-cream-200 bg-cream-50/95 px-4 pb-3 pt-3 backdrop-blur sm:rounded-t-[2rem]">
        <div className="flex items-center gap-3">
          {prev ? (
            <button type="button" onClick={back} aria-label="Voltar" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-xl shadow-sm">
              ←
            </button>
          ) : (
            <Link href={`/${config.slug}`} aria-label="Voltar ao início" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-xl shadow-sm">
              ←
            </Link>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold uppercase tracking-wide text-cocoa-500">
              Etapa {phaseIndex + 1} de {PHASES.length} · {PHASE_LABELS[view.phase]}
              {view.phase === "builder" && currentMeal && sel.lines.length > 1 ? ` ${lineNumber}` : ""}
              {view.phase === "builder" && currentMeal && view.sub !== "meal" ? ` · ${currentMeal.name}` : ""}
            </p>
            <h1 className="truncate text-lg font-extrabold leading-tight">{title}</h1>
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-cream-200">
          <div className="h-full rounded-full bg-brand-500 transition-all duration-300" style={{ width: `${((phaseIndex + 1) / PHASES.length) * 100}%` }} />
        </div>
      </header>

      <main className="flex-1 px-4 pb-44 pt-4">
        {/* ---------- Escolha do produto ---------- */}
        {view.phase === "builder" && view.sub === "meal" && (
          <div className="space-y-3">
            {menu.meals.length === 0 && <EmptyNotice text="Nenhum produto disponível no momento." />}
            {mealGroups.map((group) => (
              <div key={group.name || "_"} className="space-y-3">
                {showGroupTitles && <h2 className="px-1 pt-2 text-xs font-bold uppercase tracking-wide text-cocoa-500">{group.name || "Outros"}</h2>}
                {group.meals.map((m) => {
                  const selected = currentLine?.mealId === m.id;
                  const hints: string[] = [];
                  if (m.proteins.length) hints.push("você escolhe a proteína");
                  if (m.choices.length && m.maxChoices > 0) hints.push(`até ${m.maxChoices} acompanhamento${m.maxChoices === 1 ? "" : "s"} à sua escolha`);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => chooseMeal(m.id)}
                      className={`option-card flex-col !items-stretch !p-0 overflow-hidden ${selected ? "option-card-selected" : ""}`}
                      aria-pressed={selected}
                    >
                      {m.imageUrl && <img src={m.imageUrl} alt={m.name} className="h-44 w-full object-cover" loading="lazy" />}
                      <div className="p-4">
                        <div className="flex items-center gap-3">
                          <Radio checked={selected} />
                          <div className="min-w-0 flex-1">
                            <p className="text-lg font-extrabold leading-tight">{m.name}</p>
                            {m.description && <p className="mt-0.5 text-sm text-cocoa-500">{m.description}</p>}
                          </div>
                          <p className="shrink-0 text-base font-extrabold text-brand-600">{formatBRL(m.priceCents)}</p>
                        </div>
                        {m.included.length > 0 && (
                          <p className="mt-3 text-sm text-cocoa-700">
                            <span className="font-bold">Já acompanha:</span> {m.included.map((i) => `${emojiFor(i.name)} ${i.name}`).join(" · ")}
                          </p>
                        )}
                        {hints.length > 0 && <p className="mt-1 text-xs font-semibold text-leaf-600">✓ {hints.join(" · ")}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* ---------- Proteína ---------- */}
        {view.phase === "builder" && view.sub === "protein" && currentMeal && currentLine && (
          <div className="space-y-3">
            <IncludedBlock meal={currentMeal} />
            {currentMeal.proteins.map((p) => (
              <OptionRow key={p.id} item={p} selected={currentLine.proteinId === p.id} kind="radio" onClick={() => updateLine(currentLine.key, { proteinId: p.id })} priceMode="extra" />
            ))}
          </div>
        )}

        {/* ---------- Acompanhamentos ---------- */}
        {view.phase === "builder" && view.sub === "sides" && currentMeal && currentLine && (
          <div className="space-y-3">
            {currentMeal.included.length > 0 && (
              <section className="rounded-2xl border border-leaf-500/30 bg-leaf-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-leaf-600">Já inclusos</p>
                <ul className="mt-1.5 space-y-1">
                  {currentMeal.included.map((i) => (
                    <li key={i.id} className="flex items-center gap-2 font-bold">
                      <span className="text-leaf-600">✓</span>
                      <span>{emojiFor(i.name)} {i.name}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <div className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${limitNotice ? "bg-brand-500 text-white" : "bg-cream-100 text-cocoa-700"}`} role="status" aria-live="polite">
              {limitNotice ?? `Você escolheu ${sidesCount} de ${maxChoices} acompanhamento${maxChoices === 1 ? "" : "s"}.`}
            </div>
            <p className="px-1 text-xs font-bold uppercase tracking-wide text-cocoa-500">Escolha até {maxChoices}</p>
            {currentMeal.choices.map((s) => {
              const selected = currentLine.sideIds.includes(s.id);
              const full = !selected && sidesCount >= maxChoices;
              return <OptionRow key={s.id} item={s} selected={selected} dimmed={full} kind="check" onClick={() => toggleSide(s.id)} priceMode="extra" />;
            })}
          </div>
        )}

        {/* ---------- Adicionais ---------- */}
        {view.phase === "builder" && view.sub === "extras" && currentMeal && currentLine && (
          <div className="space-y-3">
            <IncludedBlock meal={currentMeal} chosen={currentResolved?.chosen} protein={currentResolved?.protein ?? null} />
            <p className="text-sm text-cocoa-500">Opcional. Toque para adicionar quantos quiser.</p>
            {menu.extras.map((e) => (
              <OptionRow key={e.id} item={e} selected={currentLine.extraIds.includes(e.id)} kind="check" onClick={() => toggleExtra(e.id)} priceMode="extra" />
            ))}
          </div>
        )}

        {/* ---------- Observação do produto ---------- */}
        {view.phase === "builder" && view.sub === "note" && currentMeal && currentLine && (
          <div className="space-y-3">
            <IncludedBlock meal={currentMeal} chosen={currentResolved?.chosen} protein={currentResolved?.protein ?? null} extras={currentResolved?.extras} />
            <p className="text-sm text-cocoa-500">Opcional. Ex.: sem cebola, sem feijão, pouco sal...</p>
            <textarea className="input-public min-h-32" placeholder="Digite uma observação para este item..." value={currentLine.note} maxLength={300} onChange={(e) => updateLine(currentLine.key, { note: e.target.value })} />
            <div className="flex flex-wrap gap-2">
              {NOTE_SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => appendNote(s)} className="min-h-10 rounded-full bg-cream-100 px-3 text-sm font-bold text-cocoa-700 active:scale-95">
                  + {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ---------- Carrinho ---------- */}
        {view.phase === "cart" && (
          <div className="space-y-4">
            {doneLines.length === 0 && <EmptyNotice text="Nenhum produto no pedido ainda." />}
            {doneLines.map((l, index) => (
              <article key={l.key} className="rounded-3xl border border-cream-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {doneLines.length > 1 && <p className="text-xs font-bold uppercase tracking-wide text-cocoa-500">Item {index + 1}</p>}
                    <p className="text-lg font-extrabold leading-tight">{emojiFor(l.meal.name, "🍽️")} {l.meal.name}</p>
                  </div>
                  <p className="shrink-0 font-extrabold text-brand-600">{formatBRL(l.price)}</p>
                </div>
                <div className="mt-3 space-y-2">
                  {l.protein && <Detail label="Proteína" items={[`${l.protein.name}${l.protein.priceCents ? ` + ${formatBRL(l.protein.priceCents)}` : ""}`]} />}
                  {l.included.length > 0 && <Detail label="Inclusos" items={l.included.map((i) => i.name)} />}
                  {l.chosen.length > 0 && <Detail label="Escolhidos" items={l.chosen.map((i) => `${i.name}${i.priceCents ? ` + ${formatBRL(i.priceCents)}` : ""}`)} />}
                  {l.extras.length > 0 && <Detail label={l.extras.length === 1 ? "Adicional" : "Adicionais"} items={l.extras.map((e) => `${e.name} + ${formatBRL(e.priceCents)}`)} />}
                  {l.note && <Detail label="Observação" items={[l.note]} highlight />}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => editLine(l)} className="min-h-11 rounded-xl bg-cream-100 text-sm font-bold text-cocoa-900 active:scale-95">✏️ Editar</button>
                  <button type="button" onClick={() => duplicateLine(l)} className="min-h-11 rounded-xl bg-cream-100 text-sm font-bold text-cocoa-900 active:scale-95">＋ Repetir</button>
                  <button type="button" onClick={() => removeLine(l.key)} className="min-h-11 rounded-xl bg-red-50 text-sm font-bold text-red-700 active:scale-95">🗑 Remover</button>
                </div>
              </article>
            ))}
            <button type="button" onClick={startNewMeal} className="btn-secondary w-full !border-dashed">
              ＋ Adicionar outro item
            </button>
            <Totals subtotal={order.subtotal} receivingMode={sel.receivingMode} />
          </div>
        )}

        {/* ---------- Bebidas ---------- */}
        {view.phase === "drinks" && (
          <div className="space-y-3">
            {!config.drinkRequired && (
              <button type="button" onClick={() => update({ drinkQty: {} })} className={`option-card ${drinksCount === 0 ? "option-card-selected" : ""}`} aria-pressed={drinksCount === 0}>
                <Radio checked={drinksCount === 0} />
                <span className="flex-1 text-base font-extrabold">Sem bebida</span>
              </button>
            )}
            {config.drinkRequired && <p className="text-sm text-cocoa-500">Escolha pelo menos uma bebida para continuar.</p>}
            {menu.drinks.length === 0 && <EmptyNotice text="Nenhuma bebida disponível no momento." />}
            {menu.drinks.map((d) => {
              const qty = sel.drinkQty[String(d.id)] ?? 0;
              return (
                <div key={d.id} className={`option-card ${qty > 0 ? "option-card-selected" : ""}`}>
                  {d.imageUrl && <img src={d.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" loading="lazy" />}
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-extrabold leading-tight">{d.name}</span>
                    {d.description && <span className="mt-0.5 block text-sm text-cocoa-500">{d.description}</span>}
                    <span className="mt-0.5 block text-sm font-extrabold text-brand-600">{formatBRL(d.priceCents)}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <button type="button" aria-label={`Menos ${d.name}`} onClick={() => setDrinkQty(d.id, qty - 1)} disabled={qty === 0} className="grid h-11 w-11 place-items-center rounded-full border-2 border-cream-300 bg-white text-xl font-extrabold text-cocoa-900 disabled:opacity-30">−</button>
                    <span className="w-6 text-center text-lg font-extrabold">{qty}</span>
                    <button type="button" aria-label={`Mais ${d.name}`} onClick={() => setDrinkQty(d.id, qty + 1)} className="grid h-11 w-11 place-items-center rounded-full bg-brand-500 text-xl font-extrabold text-white">+</button>
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ---------- Forma de recebimento ---------- */}
        {view.phase === "receiving" && (
          <div className="space-y-3">
            {receivingOptions.length === 0 && <EmptyNotice text="O estabelecimento ainda não configurou como entrega os pedidos." />}
            {receivingOptions.map((opt) => {
              const selected = sel.receivingMode === opt.mode;
              return (
                <button key={opt.mode} type="button" onClick={() => update({ receivingMode: opt.mode })} className={`option-card ${selected ? "option-card-selected" : ""}`} aria-pressed={selected}>
                  <Radio checked={selected} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-extrabold leading-tight">{opt.emoji} {opt.label}</span>
                    <span className="mt-0.5 block text-sm text-cocoa-500">{opt.description}</span>
                  </span>
                </button>
              );
            })}
            {receiving && receiving.mode !== "pickup" && (
              <p className="rounded-2xl bg-cream-100 px-4 py-3 text-sm text-cocoa-700">
                🛵 O valor da entrega não é cobrado aqui: ele é combinado pelo WhatsApp depois que você enviar o pedido.
                {config.deliveryAreas && <> Atendemos: {config.deliveryAreas}.</>}
              </p>
            )}
            {config.deliveryNotes && <p className="rounded-2xl bg-cream-100 px-4 py-3 text-sm text-cocoa-700">ℹ️ {config.deliveryNotes}</p>}
          </div>
        )}

        {/* ---------- Dados do cliente / endereço ---------- */}
        {view.phase === "contact" && (
          <div className="space-y-4">
            {receiving?.mode === "pickup" && (
              <section className="rounded-2xl border border-leaf-500/30 bg-leaf-50 p-4 text-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-leaf-600">🏪 Retirada no local</p>
                {config.pickupAddress && <p className="mt-1 font-bold text-cocoa-900">📍 {config.pickupAddress}</p>}
                {config.pickupHours && <p className="text-cocoa-700">🕐 {config.pickupHours}</p>}
              </section>
            )}
            <p className="text-sm text-cocoa-500">Sem cadastro — só o necessário para {receiving?.needsAddress ? "a entrega chegar até você" : "avisarmos quando estiver pronto"}.</p>
            <Field label="Seu nome">
              <input className="input-public" autoComplete="name" value={sel.customer.name} onChange={(e) => updateCustomer({ name: e.target.value })} placeholder="Como podemos te chamar?" />
            </Field>
            <Field label="Telefone (WhatsApp)">
              <input className="input-public" type="tel" inputMode="tel" autoComplete="tel" value={sel.customer.phone} onChange={(e) => updateCustomer({ phone: formatPhone(e.target.value) })} placeholder="(11) 99999-9999" />
            </Field>
            {receiving?.needsAddress && (
              <>
                <div className="grid grid-cols-[1fr_6.5rem] gap-3">
                  <Field label="Endereço (rua)">
                    <input className="input-public" autoComplete="street-address" value={sel.customer.street} onChange={(e) => updateCustomer({ street: e.target.value })} placeholder="Rua, avenida..." />
                  </Field>
                  <Field label="Número">
                    <input className="input-public" inputMode="numeric" value={sel.customer.number} onChange={(e) => updateCustomer({ number: e.target.value })} placeholder="123" />
                  </Field>
                </div>
                <Field label="Complemento (opcional)">
                  <input className="input-public" value={sel.customer.complement} onChange={(e) => updateCustomer({ complement: e.target.value })} placeholder="Apto, bloco, casa 2..." />
                </Field>
                <Field label="Bairro">
                  <input className="input-public" autoComplete="address-level3" value={sel.customer.neighborhood} onChange={(e) => updateCustomer({ neighborhood: e.target.value })} placeholder="Seu bairro" />
                </Field>
                <Field label="Ponto de referência (opcional)">
                  <input className="input-public" value={sel.customer.reference} onChange={(e) => updateCustomer({ reference: e.target.value })} placeholder="Perto do mercado, portão azul..." />
                </Field>
                <Field label="Observação para a entrega (opcional)">
                  <input className="input-public" value={sel.customer.deliveryNote} onChange={(e) => updateCustomer({ deliveryNote: e.target.value })} placeholder="Tocar o interfone, deixar na portaria..." />
                </Field>
              </>
            )}
          </div>
        )}

        {/* ---------- Pagamento ---------- */}
        {view.phase === "payment" && (
          <div className="space-y-3">
            {menu.payments.length === 0 && <EmptyNotice text="Nenhuma forma de pagamento configurada." />}
            {menu.payments.map((p) => {
              const selected = sel.paymentMethodId === p.id;
              return (
                <button key={p.id} type="button" onClick={() => update({ paymentMethodId: p.id, needsChange: null, changeFor: "" })} className={`option-card ${selected ? "option-card-selected" : ""}`} aria-pressed={selected}>
                  <Radio checked={selected} />
                  <span className="flex-1 text-base font-extrabold">{p.name}</span>
                </button>
              );
            })}
            {order.payment?.asksChange && (
              <div className="mt-4 rounded-3xl border border-cream-200 bg-white p-4">
                <p className="text-base font-extrabold">Precisa de troco?</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => update({ needsChange: true })} className={`btn-secondary ${sel.needsChange === true ? "!border-brand-500 !bg-brand-50" : ""}`}>Sim</button>
                  <button type="button" onClick={() => update({ needsChange: false, changeFor: "" })} className={`btn-secondary ${sel.needsChange === false ? "!border-brand-500 !bg-brand-50" : ""}`}>Não</button>
                </div>
                {sel.needsChange && (
                  <div className="mt-4">
                    <label className="label !text-cocoa-700">Troco para quanto?</label>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-extrabold text-cocoa-500">R$</span>
                      <input className="input-public" inputMode="decimal" value={sel.changeFor} onChange={(e) => update({ changeFor: e.target.value })} placeholder="50,00" />
                    </div>
                    <p className="mt-1.5 text-xs text-cocoa-500">
                      Subtotal dos produtos: {formatBRL(order.subtotal)}.{receiving?.needsAddress ? " O valor da entrega será somado depois." : ""}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ---------- Observações do pedido ---------- */}
        {view.phase === "notes" && (
          <div className="space-y-3">
            <p className="text-sm text-cocoa-500">Opcional. Vale para o pedido todo. Ex.: molho separado, não colocar pimenta, tocar a campainha...</p>
            <textarea className="input-public min-h-36" placeholder="Digite uma observação para este pedido..." value={sel.note} maxLength={400} onChange={(e) => update({ note: e.target.value })} />
            {doneLines.some((l) => l.note) && (
              <p className="rounded-2xl bg-cream-100 px-4 py-3 text-sm text-cocoa-700">
                ✅ As observações de cada item ({doneLines.filter((l) => l.note).length}) já estão salvas e vão junto no pedido.
              </p>
            )}
          </div>
        )}

        {/* ---------- Revisão ---------- */}
        {view.phase === "review" && (
          <div className="space-y-4">
            {order.groups.map((g, index) => {
              const l = g.line;
              return (
                <div key={g.keys.join("-")} className="rounded-3xl border border-cream-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-base font-extrabold">
                      {order.groups.length > 1 ? `${index + 1}. ` : ""}{g.qty}x {emojiFor(l.meal.name, "🍽️")} {l.meal.name}
                    </p>
                    <p className="shrink-0 font-extrabold text-brand-600">{formatBRL(l.price * g.qty)}</p>
                  </div>
                  <div className="mt-2 space-y-2">
                    {l.protein && <Detail label="Proteína" items={[`${emojiFor(l.protein.name)} ${l.protein.name}${l.protein.priceCents ? ` + ${formatBRL(l.protein.priceCents)}` : ""}`]} />}
                    {l.included.length > 0 && <Detail label="Inclusos" items={l.included.map((i) => `${emojiFor(i.name)} ${i.name}`)} />}
                    {l.chosen.length > 0 && <Detail label="Escolhidos" items={l.chosen.map((i) => `${emojiFor(i.name)} ${i.name}`)} />}
                    {l.extras.length > 0 && <Detail label={l.extras.length === 1 ? "Adicional" : "Adicionais"} items={l.extras.map((e) => `${emojiFor(e.name, "➕")} ${e.name} + ${formatBRL(e.priceCents)}${g.qty > 1 ? " (cada)" : ""}`)} />}
                    {l.note && <Detail label="📝 Observação" items={[l.note]} highlight />}
                  </div>
                </div>
              );
            })}
            <div className="rounded-3xl border border-cream-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-cocoa-500">Bebida</p>
              {order.drinks.length ? (
                <ul className="mt-1 space-y-1 font-bold">
                  {order.drinks.map((d) => (
                    <li key={d.item.id} className="flex justify-between gap-3">
                      <span>{emojiFor(d.item.name, "🥤")} {d.qty}x {d.item.name}</span>
                      <span className="text-cocoa-700">{formatBRL(d.item.priceCents * d.qty)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 font-bold">🚫 Sem bebida</p>
              )}
              {order.note && (
                <div className="mt-3">
                  <Detail label="📝 Observação do pedido" items={[order.note]} highlight />
                </div>
              )}
              <div className="mt-3 flex gap-4">
                <button type="button" onClick={() => setView({ phase: "cart" })} className="text-sm font-bold text-brand-600 underline">Editar pedido</button>
                <button type="button" onClick={() => setView({ phase: "notes" })} className="text-sm font-bold text-brand-600 underline">Editar observação</button>
              </div>
            </div>

            <div className="rounded-3xl border border-cream-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-cocoa-500">Recebimento</p>
              <p className="mt-1 font-bold">{receiving?.emoji} {receiving?.label}</p>
              <p className="mt-2 font-bold">{sel.customer.name} · {sel.customer.phone}</p>
              {receiving?.needsAddress ? (
                <>
                  <p className="text-cocoa-700">
                    {sel.customer.street}, {sel.customer.number}
                    {sel.customer.complement ? ` — ${sel.customer.complement}` : ""}
                  </p>
                  <p className="text-cocoa-700">{sel.customer.neighborhood}</p>
                  {sel.customer.reference && <p className="text-sm text-cocoa-500">Ref.: {sel.customer.reference}</p>}
                  {sel.customer.deliveryNote && <p className="text-sm text-cocoa-500">Obs.: {sel.customer.deliveryNote}</p>}
                </>
              ) : (
                <>
                  {config.pickupAddress && <p className="text-cocoa-700">📍 {config.pickupAddress}</p>}
                  {config.pickupHours && <p className="text-sm text-cocoa-500">🕐 {config.pickupHours}</p>}
                </>
              )}
              <div className="mt-2 flex gap-4">
                <button type="button" onClick={() => setView({ phase: "receiving" })} className="text-sm font-bold text-brand-600 underline">Trocar recebimento</button>
                <button type="button" onClick={() => setView({ phase: "contact" })} className="text-sm font-bold text-brand-600 underline">Editar dados</button>
              </div>
            </div>

            <div className="rounded-3xl border border-cream-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-cocoa-500">Pagamento</p>
              <p className="mt-1 font-bold">{order.payment?.name}</p>
              {order.payment?.asksChange && <p className="text-cocoa-700">{sel.needsChange ? `Troco para ${changeForLabel(sel.changeFor)}` : "Não precisa de troco"}</p>}
              <button type="button" onClick={() => setView({ phase: "payment" })} className="mt-2 text-sm font-bold text-brand-600 underline">Editar pagamento</button>
            </div>

            <Totals subtotal={order.subtotal} receivingMode={sel.receivingMode} />

            <p className="text-center text-sm text-cocoa-700">
              Ao tocar no botão, o WhatsApp abre com o pedido preenchido — você confere e envia.
              {receiving?.needsAddress ? " O estabelecimento confirma com você o valor da entrega e o total final." : ""}
            </p>
            {!isValidWhatsApp(config.whatsappNumber) && (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">O número de WhatsApp ainda não foi configurado no painel.</p>
            )}
            <button type="button" onClick={copyMessage} className="w-full text-center text-sm font-bold text-cocoa-500 underline">
              {copied ? "Pedido copiado ✅" : "Copiar pedido em texto"}
            </button>
          </div>
        )}
      </main>

      {/* Barra inferior fixa com subtotal e ação principal */}
      <footer className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t border-cream-200 bg-white/95 px-4 pt-3 backdrop-blur safe-bottom sm:sticky sm:rounded-b-[2rem]">
        {error && (
          <p role="alert" className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p>
        )}
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-cocoa-500">Subtotal</p>
            <p className="text-2xl font-extrabold leading-none">{formatBRL(view.phase === "builder" ? order.runningSubtotal : order.subtotal)}</p>
            <p className="mt-0.5 text-[11px] leading-tight text-cocoa-500">{footerHint}</p>
          </div>
          {view.phase === "review" ? (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={logOrder}
              className="btn-primary flex-1 !bg-[#25D366] !shadow-[0_8px_20px_rgba(37,211,102,0.35)] hover:!bg-[#1fb95a]"
            >
              Enviar pedido pelo WhatsApp
            </a>
          ) : (
            <button type="button" onClick={next} className="btn-primary flex-1">{primaryLabel}</button>
          )}
        </div>
      </footer>
    </div>
  );
}

/* ---------- Componentes auxiliares ---------- */

function IncludedBlock({ meal, protein, chosen, extras }: { meal: PublicMeal; protein?: MenuItem | null; chosen?: MenuItem[]; extras?: MenuItem[] }) {
  const parts: string[] = [];
  if (protein) parts.push(`${emojiFor(protein.name)} ${protein.name}`);
  meal.included.forEach((i) => parts.push(`${emojiFor(i.name)} ${i.name}`));
  chosen?.forEach((i) => parts.push(`${emojiFor(i.name)} ${i.name}`));
  extras?.forEach((i) => parts.push(`${emojiFor(i.name, "➕")} ${i.name}`));
  if (parts.length === 0) return null;
  return (
    <section className="rounded-2xl border border-leaf-500/30 bg-leaf-50 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-leaf-600">Seu item até agora</p>
      <p className="mt-1 text-sm font-bold text-cocoa-900">{parts.join(" · ")}</p>
    </section>
  );
}

function Detail({ label, items, highlight }: { label: string; items: string[]; highlight?: boolean }) {
  return (
    <div className={highlight ? "rounded-xl bg-cream-100 px-3 py-2" : ""}>
      <p className="text-xs font-bold uppercase tracking-wide text-cocoa-500">{label}</p>
      <p className="text-sm font-semibold text-cocoa-900">{items.join(highlight ? " " : ", ")}</p>
    </div>
  );
}

function Radio({ checked }: { checked: boolean }) {
  return (
    <span aria-hidden className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 ${checked ? "border-brand-500 bg-brand-500" : "border-cream-300 bg-white"}`}>
      {checked && <span className="h-3 w-3 rounded-full bg-white" />}
    </span>
  );
}

function Check({ checked }: { checked: boolean }) {
  return (
    <span aria-hidden className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 text-base font-extrabold text-white ${checked ? "border-brand-500 bg-brand-500" : "border-cream-300 bg-white"}`}>
      {checked ? "✓" : ""}
    </span>
  );
}

function OptionRow({ item, selected, dimmed, kind, onClick, priceMode }: { item: MenuItem; selected: boolean; dimmed?: boolean; kind: "check" | "radio"; onClick: () => void; priceMode: "extra" | "full" }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className={`option-card ${selected ? "option-card-selected" : ""} ${dimmed ? "opacity-60" : ""}`}>
      {kind === "check" ? <Check checked={selected} /> : <Radio checked={selected} />}
      {item.imageUrl && <img src={item.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" loading="lazy" />}
      <span className="min-w-0 flex-1">
        <span className="block text-base font-extrabold leading-tight">{item.name}</span>
        {item.description && <span className="mt-0.5 block text-sm text-cocoa-500">{item.description}</span>}
      </span>
      {item.priceCents > 0 && <span className="shrink-0 text-sm font-extrabold text-brand-600">{priceMode === "extra" ? `+ ${formatBRL(item.priceCents)}` : formatBRL(item.priceCents)}</span>}
    </button>
  );
}

function EmptyNotice({ text }: { text: string }) {
  return <p className="rounded-2xl border-2 border-dashed border-cream-300 p-5 text-center text-cocoa-500">{text}</p>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label !text-cocoa-700">{label}</span>
      {children}
    </label>
  );
}

/** Bloco de valores. O sistema mostra apenas o subtotal; a taxa de entrega (quando há) é combinada pelo WhatsApp. */
function Totals({ subtotal, receivingMode }: { subtotal: number; receivingMode: ReceivingMode | null }) {
  const pickup = receivingMode === "pickup";
  return (
    <section className="rounded-3xl bg-cocoa-900 p-5 text-white">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-base font-extrabold">Subtotal</span>
        <span className="text-2xl font-extrabold">{formatBRL(subtotal)}</span>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-3 text-sm">
        <span className="font-bold">Entrega</span>
        <span className="text-right">{pickup ? "retirada no local · sem taxa" : "consultar pelo WhatsApp"}</span>
      </div>
      <div className="my-3 border-t border-dashed border-white/30" />
      {pickup ? (
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-base font-extrabold">Total</span>
          <span className="text-xl font-extrabold">{formatBRL(subtotal)}</span>
        </div>
      ) : (
        <p className="text-sm text-white/85">
          <span className="font-extrabold text-white">Total final:</span> confirmado após consulta da entrega
        </p>
      )}
    </section>
  );
}
