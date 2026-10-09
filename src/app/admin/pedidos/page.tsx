import { deleteOrdersAction, toggleOrderDoneAction } from "@/app/admin/actions";
import { ActionForm, AdminHeader } from "@/components/admin/ui";
import { getOrders, requireCurrentEstablishment } from "@/lib/data";
import { formatBRL, normalizeWhatsApp } from "@/lib/format";
import { receivingInfo } from "@/lib/order";

export const metadata = { title: "Pedidos" };

function when(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: process.env.TZ || "America/Sao_Paulo",
  }).format(date);
}

export default async function PedidosPage() {
  const { est } = await requireCurrentEstablishment();
  const list = await getOrders(est.id);
  const open = list.filter((o) => !o.done);
  const done = list.filter((o) => o.done);

  return (
    <main>
      <AdminHeader title="🧾 Pedidos" back="/admin" subtitle={open.length ? `${open.length} em aberto` : "Nenhum pedido em aberto"} />

      <p className="mb-4 rounded-2xl border border-admin-100 bg-admin-50 p-4 text-sm text-admin-800">
        Aqui ficam os pedidos que os clientes enviaram pelo cardápio. A conversa acontece no seu WhatsApp — esta lista serve para
        consulta e para marcar o que já foi atendido.
      </p>

      {list.length === 0 && (
        <p className="rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center text-slate-500">Nenhum pedido registrado ainda.</p>
      )}

      <ul className="space-y-3">
        {[...open, ...done].map((o) => {
          const r = receivingInfo(est, o.receivingMode);
          const phone = normalizeWhatsApp(o.customerPhone);
          return (
            <li key={o.id} className={`admin-card !p-4 ${o.done ? "opacity-70" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    #{o.id} · {when(o.createdAt)}
                  </p>
                  <p className="text-lg font-extrabold leading-tight">{o.customerName || "Cliente"}</p>
                  <p className="text-sm text-slate-600">{o.summary}</p>
                </div>
                <p className="shrink-0 font-extrabold text-admin-800">{formatBRL(o.subtotalCents)}</p>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {r.emoji} {r.label} · 💳 {o.paymentName || "-"}
                {o.done ? " · ✅ atendido" : ""}
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-bold text-admin-700">Ver pedido completo</summary>
                <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs text-slate-800">{o.message}</pre>
              </details>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {phone ? (
                  <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" className="btn-admin-soft">
                    💬 Falar com cliente
                  </a>
                ) : (
                  <span />
                )}
                <ActionForm action={toggleOrderDoneAction.bind(null, o.id)} buttonClassName={o.done ? "btn-admin-soft w-full" : "btn-admin-soft w-full !bg-green-50 !text-green-800"}>
                  {o.done ? "Reabrir" : "✓ Atendido"}
                </ActionForm>
              </div>
            </li>
          );
        })}
      </ul>

      {done.length > 0 && (
        <ActionForm
          action={deleteOrdersAction.bind(null, done.map((o) => o.id))}
          confirm={`Apagar ${done.length} pedido(s) já atendido(s)? Essa ação não pode ser desfeita.`}
          className="mt-6"
          buttonClassName="btn-danger-soft w-full"
        >
          🗑️ Limpar pedidos atendidos
        </ActionForm>
      )}
    </main>
  );
}
