import { saveHoursAction } from "@/app/admin/actions";
import { AdminHeader, StatusForm } from "@/components/admin/ui";
import { requireCurrentEstablishment } from "@/lib/data";

export const metadata = { title: "Horários" };

export default async function HorariosPage() {
  const { est } = await requireCurrentEstablishment();

  return (
    <main>
      <AdminHeader title="🕐 Horários" back="/admin/configuracoes" subtitle="Informações mostradas ao cliente" />

      <div className="admin-card">
        <StatusForm action={saveHoursAction} submitLabel="Salvar horários">
          <label className="block">
            <span className="label">Dias de funcionamento</span>
            <input className="input" name="openingDays" defaultValue={est.openingDays} placeholder="Ex.: Segunda a sexta" />
          </label>
          <label className="mt-4 block">
            <span className="label">Horário de atendimento</span>
            <input className="input" name="openingHours" defaultValue={est.openingHours} placeholder="Ex.: 11h às 14h" />
          </label>
          <label className="mt-4 block">
            <span className="label">Mensagem quando os pedidos estiverem pausados</span>
            <input className="input" name="pausedMessage" defaultValue={est.pausedMessage} placeholder="Ex.: Voltamos amanhã às 11h" />
            <span className="mt-1 block text-xs text-slate-500">Aparece para o cliente junto com “No momento não estamos recebendo pedidos.”</span>
          </label>
        </StatusForm>
      </div>

      <p className="mt-4 text-center text-xs text-slate-500">
        Para pausar ou reabrir os pedidos agora, use o botão na tela inicial do painel.
      </p>
    </main>
  );
}
