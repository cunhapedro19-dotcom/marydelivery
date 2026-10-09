import { saveDeliveryAction } from "@/app/admin/actions";
import { DeliveryServiceSelect } from "@/components/admin/settings-widgets";
import { AdminHeader, StatusForm } from "@/components/admin/ui";
import { requireCurrentEstablishment } from "@/lib/data";

export const metadata = { title: "Entrega" };

export default async function EntregaPage() {
  const { est } = await requireCurrentEstablishment();

  return (
    <main>
      <AdminHeader title="🛵 Entrega" back="/admin/configuracoes" subtitle="Como o cliente pode receber o pedido" />

      <div className="mb-4 rounded-2xl border border-admin-100 bg-admin-50 p-4 text-sm text-admin-800">
        Ative uma ou mais opções. O cliente escolhe entre elas ao finalizar. <strong>O cardápio não calcula taxa de entrega</strong> —
        quando há entrega, o valor é combinado por você pelo WhatsApp.
      </div>

      <StatusForm action={saveDeliveryAction} submitLabel="Salvar">
        {/* Retirada */}
        <section className="admin-card">
          <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3">
            <span>
              <span className="block text-lg font-extrabold">🏪 Retirada no local</span>
              <span className="block text-sm text-slate-500">O cliente busca o pedido. Não pedimos endereço dele.</span>
            </span>
            <input type="checkbox" name="pickupEnabled" defaultChecked={est.pickupEnabled} className="h-7 w-7 shrink-0 accent-admin-600" />
          </label>
          <label className="mt-4 block">
            <span className="label">Endereço para retirada</span>
            <input className="input" name="pickupAddress" defaultValue={est.pickupAddress} placeholder="Rua Exemplo, 100 — Centro" />
          </label>
          <label className="mt-3 block">
            <span className="label">Horário de retirada</span>
            <input className="input" name="pickupHours" defaultValue={est.pickupHours} placeholder="11:00 às 20:00" />
          </label>
        </section>

        {/* Entrega própria */}
        <section className="admin-card mt-4">
          <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3">
            <span>
              <span className="block text-lg font-extrabold">🛵 Entrega própria</span>
              <span className="block text-sm text-slate-500">Você entrega com sua própria equipe. Pedimos o endereço do cliente.</span>
            </span>
            <input type="checkbox" name="ownDeliveryEnabled" defaultChecked={est.ownDeliveryEnabled} className="h-7 w-7 shrink-0 accent-admin-600" />
          </label>
        </section>

        {/* Aplicativo */}
        <section className="admin-card mt-4">
          <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3">
            <span>
              <span className="block text-lg font-extrabold">🚗 Entrega por aplicativo</span>
              <span className="block text-sm text-slate-500">99Flash, Uber, Lalamove, entregador parceiro... Pedimos o endereço do cliente.</span>
            </span>
            <input type="checkbox" name="appDeliveryEnabled" defaultChecked={est.appDeliveryEnabled} className="h-7 w-7 shrink-0 accent-admin-600" />
          </label>
          <div className="mt-4">
            <DeliveryServiceSelect initial={est.appDeliveryService} />
          </div>
        </section>

        {/* Informações extras */}
        <section className="admin-card mt-4">
          <h2 className="text-lg font-extrabold">Informações para o cliente</h2>
          <label className="mt-3 block">
            <span className="label">Regiões / bairros atendidos (opcional)</span>
            <textarea className="input min-h-20" name="deliveryAreas" defaultValue={est.deliveryAreas} placeholder="Ex.: Centro, Jardim das Flores e Vila Nova" />
          </label>
          <label className="mt-3 block">
            <span className="label">Observação sobre a entrega (opcional)</span>
            <textarea className="input min-h-20" name="deliveryNotes" defaultValue={est.deliveryNotes} placeholder="Ex.: O valor da entrega depende do bairro. Entregamos em até 40 minutos." />
          </label>
        </section>
      </StatusForm>
    </main>
  );
}
