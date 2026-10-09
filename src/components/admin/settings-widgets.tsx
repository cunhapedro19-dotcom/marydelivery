"use client";

import { useEffect, useState } from "react";
import { formatWhatsAppDisplay, isValidWhatsApp, normalizeWhatsApp } from "@/lib/format";

/* ---------- WhatsApp: campo com formatação natural e validação em tempo real ---------- */

export function WhatsAppNumberField({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial ? formatWhatsAppDisplay(initial) : "");
  const digits = normalizeWhatsApp(value);
  const valid = isValidWhatsApp(digits);
  const touched = value.trim().length > 0;
  const changed = digits !== normalizeWhatsApp(initial);

  return (
    <div>
      <label className="block">
        <span className="label">Número</span>
        <input
          className={`input ${touched && !valid ? "!border-red-400" : ""}`}
          name="whatsappNumber"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => valid && setValue(formatWhatsAppDisplay(digits))}
          placeholder="(21) 99999-9999"
          aria-invalid={touched && !valid}
        />
      </label>
      {!touched && (
        <p className="mt-1.5 text-xs text-slate-500">Digite com DDD, do jeito que você costuma escrever. Ex.: (21) 99999-9999</p>
      )}
      {touched && !valid && (
        <p className="mt-1.5 text-sm font-bold text-red-700" role="alert">
          ⚠️ Digite um número de WhatsApp válido.
        </p>
      )}
      {valid && (
        <p className="mt-1.5 text-xs text-slate-500">
          Será salvo no formato internacional: <span className="font-bold text-slate-700">+{digits}</span>
          {changed && initial ? " · toque em Salvar para os pedidos passarem a usar este número." : ""}
        </p>
      )}
    </div>
  );
}

/* ---------- Entrega por aplicativo: serviço utilizado ---------- */

const KNOWN_SERVICES = ["99Flash", "Uber", "Lalamove", "Loggi", "Entregador parceiro"];

export function DeliveryServiceSelect({ initial }: { initial: string }) {
  const known = KNOWN_SERVICES.includes(initial);
  const [choice, setChoice] = useState(known ? initial : initial ? "other" : "");
  const [other, setOther] = useState(known ? "" : initial);
  const finalValue = choice === "other" ? other.trim() : choice;

  return (
    <div>
      <input type="hidden" name="appDeliveryService" value={finalValue} />
      <label className="block">
        <span className="label">Serviço utilizado</span>
        <select className="input" value={choice} onChange={(e) => setChoice(e.target.value)}>
          <option value="">Escolha o serviço</option>
          {KNOWN_SERVICES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
          <option value="other">Outro</option>
        </select>
      </label>
      {choice === "other" && (
        <label className="mt-3 block">
          <span className="label">Nome do serviço</span>
          <input className="input" value={other} onChange={(e) => setOther(e.target.value)} placeholder="Ex.: Moto Express do bairro" />
        </label>
      )}
      <p className="mt-1.5 text-xs text-slate-500">
        O cliente verá &quot;Entrega por {finalValue || "…"}&quot;. Você continua chamando a entrega no aplicativo — não há integração automática.
      </p>
    </div>
  );
}

/* ---------- Link público do cardápio ---------- */

export function PublicLink({ slug }: { slug: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/${slug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignora */
    }
  }

  return (
    <div className="rounded-2xl border border-admin-100 bg-admin-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-admin-800">Link do seu cardápio</p>
      <p className="mt-1 break-all font-bold text-slate-900">{origin ? url : `/${slug}`}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={copy} className="btn-admin-soft">
          {copied ? "Copiado ✅" : "📋 Copiar link"}
        </button>
        <a href={`/${slug}`} target="_blank" rel="noopener noreferrer" className="btn-admin-soft">
          👀 Abrir
        </a>
      </div>
      <p className="mt-2 text-xs text-slate-500">Envie este link para os clientes pelo WhatsApp, Instagram ou onde preferir.</p>
    </div>
  );
}
