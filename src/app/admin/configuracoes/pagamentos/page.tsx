import {
  addPaymentMethodAction,
  deletePaymentMethodAction,
  togglePaymentMethodAction,
  updatePaymentMethodAction,
} from "@/app/admin/actions";
import { ActionForm, AdminHeader, StatusForm } from "@/components/admin/ui";
import { getPaymentMethods, requireCurrentEstablishment } from "@/lib/data";

export const metadata = { title: "Pagamentos" };

export default async function PagamentosPage() {
  const { est } = await requireCurrentEstablishment();
  const methods = await getPaymentMethods(est.id);

  return (
    <main>
      <AdminHeader title="💳 Pagamentos" back="/admin/configuracoes" subtitle="O cliente escolhe uma delas ao finalizar" />

      <div className="admin-card mb-4">
        <StatusForm action={addPaymentMethodAction} submitLabel="＋ Adicionar forma de pagamento" buttonClassName="btn-admin-outline">
          <label className="block">
            <span className="label">Nome</span>
            <input className="input" name="name" placeholder="Ex.: Pix, Dinheiro, Cartão, Vale-refeição" required />
          </label>
          <label className="mt-3 flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border-2 border-slate-200 px-4 py-2">
            <input type="checkbox" name="asksChange" className="h-6 w-6 accent-admin-600" />
            <span className="text-sm font-bold">Perguntar se precisa de troco (use para dinheiro)</span>
          </label>
        </StatusForm>
      </div>

      {methods.length === 0 && (
        <p className="rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center text-slate-500">Nenhuma forma de pagamento. Adicione pelo menos uma.</p>
      )}

      <ul className="space-y-3">
        {methods.map((m) => (
          <li key={m.id} className={`admin-card !p-4 ${m.active ? "" : "opacity-80"}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-extrabold">{m.name}</p>
                {m.asksChange && <p className="text-sm text-slate-500">Pergunta sobre troco</p>}
                <p className={`text-sm font-bold ${m.active ? "text-green-700" : "text-red-600"}`}>{m.active ? "🟢 Ativa" : "🔴 Desativada"}</p>
              </div>
              <ActionForm action={togglePaymentMethodAction.bind(null, m.id)} buttonClassName={m.active ? "btn-danger-soft" : "btn-admin-soft !bg-green-50 !text-green-800"}>
                {m.active ? "Desativar" : "Ativar"}
              </ActionForm>
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-bold text-admin-700">✏️ Editar</summary>
              <StatusForm action={updatePaymentMethodAction} submitLabel="Salvar" buttonClassName="btn-admin-soft w-full">
                <input type="hidden" name="id" value={m.id} />
                <input className="input mt-3" name="name" defaultValue={m.name} required />
                <label className="mt-3 flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border-2 border-slate-200 px-4 py-2">
                  <input type="checkbox" name="asksChange" defaultChecked={m.asksChange} className="h-6 w-6 accent-admin-600" />
                  <span className="text-sm font-bold">Perguntar se precisa de troco</span>
                </label>
              </StatusForm>
              <ActionForm action={deletePaymentMethodAction.bind(null, m.id)} confirm={`Excluir "${m.name}"?`} className="mt-2" buttonClassName="btn-danger-soft w-full">
                🗑️ Excluir
              </ActionForm>
            </details>
          </li>
        ))}
      </ul>
    </main>
  );
}
