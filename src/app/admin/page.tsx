import Link from "next/link";
import { and, count, eq } from "drizzle-orm";
import { logoutAction, toggleAcceptingOrdersAction } from "@/app/admin/actions";
import { ActionForm, PwaSetup } from "@/components/admin/ui";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { currentUserHasDefaultPassword } from "@/lib/auth";
import { requireCurrentEstablishment } from "@/lib/data";
import { formatWhatsAppDisplay, isValidWhatsApp } from "@/lib/format";
import { availableReceivingModes } from "@/lib/order";

export default async function AdminHomePage() {
  const { session, est } = await requireCurrentEstablishment();
  const [defaultPassword, [openOrders]] = await Promise.all([
    currentUserHasDefaultPassword(session.userId),
    db
      .select({ n: count() })
      .from(orders)
      .where(and(eq(orders.establishmentId, est.id), eq(orders.done, false))),
  ]);
  const modes = availableReceivingModes(est);
  const whatsappOk = isValidWhatsApp(est.whatsappNumber);

  const links = [
    { href: "/admin/cardapio", emoji: "🍽️", label: "Cardápio", hint: "Produtos, adicionais, bebidas e composição" },
    {
      href: "/admin/pedidos",
      emoji: "🧾",
      label: "Pedidos",
      hint: openOrders.n ? `${openOrders.n} em aberto` : "Pedidos enviados pelo cardápio",
    },
    { href: "/admin/configuracoes", emoji: "⚙️", label: "Configurações", hint: "Negócio, WhatsApp, entrega, pagamentos e horários" },
  ];

  return (
    <main className="pt-6">
      <div className="mb-5 flex items-center gap-3">
        {est.logoUrl ? (
          <img src={est.logoUrl} alt="" className="h-12 w-12 rounded-2xl object-cover shadow-sm" />
        ) : (
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-2xl shadow-sm">{est.emoji}</span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold leading-tight">{est.name}</h1>
          <p className="text-sm text-slate-500">Painel do cardápio</p>
        </div>
      </div>

      <PwaSetup />

      {defaultPassword && (
        <Link href="/admin/configuracoes#senha" className="mb-4 block rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          🔐 <strong>Você ainda usa a senha inicial.</strong> Toque aqui para trocar por uma senha só sua.
        </Link>
      )}

      {!whatsappOk && (
        <div className="mb-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-amber-900">
          <p className="text-lg font-extrabold">📱 Configure seu WhatsApp</p>
          <p className="mt-1 text-sm">Cadastre o número que receberá os pedidos feitos pelo seu cardápio.</p>
          <Link href="/admin/configuracoes/whatsapp" className="btn-admin mt-4">
            Configurar agora
          </Link>
        </div>
      )}
      {modes.length === 0 && (
        <Link href="/admin/configuracoes/entrega" className="mb-4 block rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          🛵 <strong>Ative pelo menos uma forma de recebimento</strong> (retirada, entrega própria ou aplicativo).
        </Link>
      )}

      {!whatsappOk ? (
        <section className="admin-card border-2 border-red-200 text-center">
          <p className="text-xl font-extrabold">🔴 CARDÁPIO NÃO PUBLICADO</p>
          <p className="mt-1 text-sm text-slate-500">
            Os clientes veem: “No momento não estamos recebendo pedidos.” Cadastre o WhatsApp para poder abrir os pedidos.
          </p>
        </section>
      ) : (
        <section className={`admin-card border-2 text-center ${est.acceptingOrders ? "border-green-200" : "border-red-200"}`}>
          <p className="text-xl font-extrabold">{est.acceptingOrders ? "🟢 RECEBENDO PEDIDOS" : "🔴 PEDIDOS PAUSADOS"}</p>
          <p className="mt-1 text-sm text-slate-500">
            {est.acceptingOrders
              ? `Os pedidos chegam no WhatsApp ${formatWhatsAppDisplay(est.whatsappNumber)}.`
              : "Os clientes veem: “No momento não estamos recebendo pedidos.”"}
          </p>
          <ActionForm
            action={toggleAcceptingOrdersAction}
            className="mt-4"
            buttonClassName={est.acceptingOrders ? "btn-admin !bg-red-600 hover:!bg-red-700" : "btn-admin !bg-green-600 hover:!bg-green-700"}
          >
            {est.acceptingOrders ? "PAUSAR PEDIDOS" : "REABRIR PEDIDOS"}
          </ActionForm>
        </section>
      )}

      <nav className="mt-5 space-y-3">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="admin-link-card">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-admin-50 text-2xl">{l.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block">{l.label}</span>
              <span className="block truncate text-sm font-normal text-slate-500">{l.hint}</span>
            </span>
            <span className="text-slate-400">›</span>
          </Link>
        ))}
      </nav>

      <div className="mt-6 space-y-3">
        <a href={`/${est.slug}`} target="_blank" rel="noopener noreferrer" className="btn-admin-outline">
          👀 Ver cardápio
        </a>
        <ActionForm action={logoutAction} buttonClassName="btn min-h-14 w-full text-slate-500 hover:bg-slate-100">
          Sair
        </ActionForm>
      </div>
    </main>
  );
}
