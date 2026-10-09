import Link from "next/link";
import { saveWhatsAppAction } from "@/app/admin/actions";
import { WhatsAppNumberField } from "@/components/admin/settings-widgets";
import { AdminHeader, StatusForm } from "@/components/admin/ui";
import { requireCurrentEstablishment } from "@/lib/data";
import { formatWhatsAppDisplay, isValidWhatsApp } from "@/lib/format";
import { WHATSAPP_TEST_MESSAGE, canReceiveOrders, whatsappUrl } from "@/lib/order";

export const metadata = { title: "WhatsApp" };

type Props = { searchParams: Promise<{ motivo?: string }> };

export default async function WhatsAppPage({ searchParams }: Props) {
  const { est } = await requireCurrentEstablishment();
  const { motivo } = await searchParams;
  const configured = isValidWhatsApp(est.whatsappNumber);
  const testUrl = configured ? whatsappUrl(est.whatsappNumber, WHATSAPP_TEST_MESSAGE) : null;

  return (
    <main>
      <AdminHeader title="📱 WhatsApp" back="/admin/configuracoes" subtitle="Para onde os pedidos são enviados" />

      {motivo === "publicar" && (
        <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
          Para reabrir os pedidos, cadastre primeiro um número de WhatsApp válido. É para ele que os pedidos serão enviados.
        </p>
      )}

      {!configured && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="text-lg font-extrabold">📱 Configure seu WhatsApp</p>
          <p className="mt-1 text-sm">Cadastre o número que receberá os pedidos feitos pelo seu cardápio.</p>
        </div>
      )}

      <div className="admin-card">
        <StatusForm action={saveWhatsAppAction} submitLabel="Salvar alterações">
          <h2 className="text-lg font-extrabold">WhatsApp para receber pedidos</h2>
          <p className="mb-4 mt-1 text-sm text-slate-500">
            Quando o cliente finaliza, o WhatsApp dele abre com o pedido pronto para enviar a este número. Nada é enviado
            automaticamente — o cliente vê a conversa e toca em enviar.
          </p>
          <WhatsAppNumberField key={est.whatsappNumber} initial={est.whatsappNumber} />

          <label className="mt-6 block">
            <span className="label">Mensagem inicial (opcional)</span>
            <textarea
              className="input min-h-20"
              name="whatsappGreeting"
              defaultValue={est.whatsappGreeting}
              maxLength={200}
              placeholder="Olá! Gostaria de fazer um pedido pelo cardápio."
            />
            <span className="mt-1 block text-xs text-slate-500">É a primeira linha da mensagem; logo abaixo entra o pedido completo.</span>
          </label>
        </StatusForm>
      </div>

      <div className="admin-card mt-4">
        <h2 className="text-lg font-extrabold">Testar WhatsApp</h2>
        <p className="mt-1 text-sm text-slate-500">
          {configured ? (
            <>
              Número cadastrado: <span className="font-bold text-slate-800">{formatWhatsAppDisplay(est.whatsappNumber)}</span>. O botão abre o
              WhatsApp com a mensagem <em>“{WHATSAPP_TEST_MESSAGE}”</em> — se abrir a conversa certa, está tudo pronto.
            </>
          ) : (
            "Salve um número válido para poder testar."
          )}
        </p>
        {testUrl ? (
          <a href={testUrl} target="_blank" rel="noopener noreferrer" className="btn-admin-outline mt-3">
            📲 Testar WhatsApp
          </a>
        ) : (
          <span aria-disabled className="btn-admin-outline mt-3 pointer-events-none opacity-50">
            📲 Testar WhatsApp
          </span>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
        <p className="font-bold">Situação do cardápio</p>
        {canReceiveOrders(est) ? (
          <p className="mt-1 text-green-700">🟢 Recebendo pedidos neste número.</p>
        ) : configured ? (
          <p className="mt-1 text-slate-600">
            🔴 Pedidos pausados.{" "}
            <Link href="/admin" className="font-bold text-admin-700 underline">
              Reabra na tela inicial
            </Link>{" "}
            quando quiser começar a receber.
          </p>
        ) : (
          <p className="mt-1 text-red-700">🔴 Não publicado: o cardápio só recebe pedidos depois que um número válido for salvo.</p>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-slate-500">
        Este número é exclusivo de <strong>{est.name}</strong>. Outros estabelecimentos usam os próprios números.
      </p>
    </main>
  );
}
