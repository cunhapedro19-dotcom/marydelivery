import Link from "next/link";
import { changePasswordAction, saveLoginEmailAction } from "@/app/admin/actions";
import { AdminHeader, StatusForm } from "@/components/admin/ui";
import { requireCurrentEstablishment } from "@/lib/data";
import { formatWhatsAppDisplay } from "@/lib/format";
import { availableReceivingModes } from "@/lib/order";

export const metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const { session, est } = await requireCurrentEstablishment();
  const modes = availableReceivingModes(est);

  const links = [
    { href: "/admin/configuracoes/negocio", emoji: "🏪", label: "Dados do negócio", hint: `${est.name} · link: /${est.slug}` },
    {
      href: "/admin/configuracoes/whatsapp",
      emoji: "📱",
      label: "WhatsApp",
      hint: est.whatsappNumber ? formatWhatsAppDisplay(est.whatsappNumber) : "⚠️ Ainda não cadastrado",
      warn: !est.whatsappNumber,
    },
    {
      href: "/admin/configuracoes/entrega",
      emoji: "🛵",
      label: "Entrega",
      hint: modes.length ? modes.map((m) => m.label).join(" · ") : "⚠️ Nenhuma forma de recebimento ativa",
      warn: modes.length === 0,
    },
    { href: "/admin/configuracoes/pagamentos", emoji: "💳", label: "Pagamentos", hint: "Pix, dinheiro, cartão..." },
    {
      href: "/admin/configuracoes/horarios",
      emoji: "🕐",
      label: "Horários",
      hint: [est.openingDays, est.openingHours].filter(Boolean).join(" · ") || "Dias e horário de atendimento",
    },
  ];

  return (
    <main>
      <AdminHeader title="⚙️ Configurações" back="/admin" subtitle={est.name} />

      <nav className="space-y-3">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={`admin-link-card ${l.warn ? "!border-red-200" : ""}`}>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-admin-50 text-2xl">{l.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block">{l.label}</span>
              <span className={`block truncate text-sm font-normal ${l.warn ? "text-red-700" : "text-slate-500"}`}>{l.hint}</span>
            </span>
            <span className="text-slate-400">›</span>
          </Link>
        ))}
      </nav>

      <div id="senha" className="admin-card mt-6">
        <h2 className="text-lg font-extrabold">🔐 Meu acesso</h2>
        <p className="mt-1 text-sm text-slate-500">
          Usuário: <strong>{session.username}</strong>
          {session.email ? <> · e-mail: <strong>{session.email}</strong></> : null}
        </p>
        <StatusForm action={changePasswordAction} submitLabel="Trocar senha" buttonClassName="btn-admin-outline">
          <label className="mt-3 block">
            <span className="label">Senha atual</span>
            <input className="input" type="password" name="current" autoComplete="current-password" required />
          </label>
          <label className="mt-4 block">
            <span className="label">Nova senha</span>
            <input className="input" type="password" name="next" autoComplete="new-password" minLength={6} required />
          </label>
          <label className="mt-4 block">
            <span className="label">Repita a nova senha</span>
            <input className="input" type="password" name="confirm" autoComplete="new-password" minLength={6} required />
          </label>
        </StatusForm>
      </div>

      <div className="admin-card mt-4">
        <h2 className="text-lg font-extrabold">📧 E-mail (opcional)</h2>
        <p className="mt-1 text-sm text-slate-500">
          Se quiser, cadastre um e-mail — dá pra entrar com ele também. Deixe vazio para remover.
        </p>
        <StatusForm action={saveLoginEmailAction} submitLabel="Salvar e-mail" buttonClassName="btn-admin-outline">
          <label className="mt-3 block">
            <span className="label">E-mail de acesso</span>
            <input className="input" type="email" name="email" defaultValue={session.email ?? ""} placeholder="voce@email.com" />
          </label>
        </StatusForm>
      </div>
    </main>
  );
}
