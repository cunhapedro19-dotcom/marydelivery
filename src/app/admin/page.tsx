import Link from "next/link";
import { AdminLayout, AdminLinkCard, PwaSetup } from "@/components/admin/ui";
import { requireCurrentEstablishment } from "@/lib/data";
import { formatBRL } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const { est } = await requireCurrentEstablishment();

  return (
    <AdminLayout title="Início">
      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4">{est.name} {est.emoji}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <AdminLinkCard href="/admin/cardapio">
              <span className="text-2xl">🍽️</span>
              <div>
                <p className="font-bold text-slate-800">Cardápio</p>
                <p className="text-sm text-slate-500">Produtos, categorias, adicionais, bebidas</p>
              </div>
            </AdminLinkCard>
            <AdminLinkCard href="/admin/configuracoes">
              <span className="text-2xl">⚙️</span>
              <div>
                <p className="font-bold text-slate-800">Configurações</p>
                <p className="text-sm text-slate-500">Negócio, horários, entrega, pagamentos, WhatsApp</p>
              </div>
            </AdminLinkCard>
            <AdminLinkCard href="/admin/pedidos">
              <span className="text-2xl">📋</span>
              <div>
                <p className="font-bold text-slate-800">Pedidos</p>
                <p className="text-sm text-slate-500">Ver pedidos recebidos pelo WhatsApp</p>
              </div>
            </AdminLinkCard>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4">Status do cardápio</h2>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-700">Recebendo pedidos</span>
              <span className={est.acceptingOrders ? "text-green-700 font-bold" : "text-red-700 font-bold"}>
                {est.acceptingOrders ? "✅ ABERTO" : "🔴 PAUSADO"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-700">WhatsApp configurado</span>
              <span className={est.whatsappNumber ? "text-green-700 font-bold" : "text-red-700 font-bold"}>
                {est.whatsappNumber ? "✅ Sim" : "❌ Não"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-700">Logo do cardápio</span>
              <span className={est.logoUrl ? "text-green-700 font-bold" : "text-amber-700 font-bold"}>
                {est.logoUrl ? "✅ Cadastrada" : "⚠️ Pendente"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-700">Foto de fundo (hero)</span>
              <span className={est.heroUrl ? "text-green-700 font-bold" : "text-amber-700 font-bold"}>
                {est.heroUrl ? "✅ Cadastrada" : "⚠️ Pendente"}
              </span>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4">Ações rápidas</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/admin/cardapio/produtos/novo" className="admin-link-card">
              <span className="text-2xl">➕</span>
              <div>
                <p className="font-bold text-slate-800">Adicionar produto</p>
                <p className="text-sm text-slate-500">Nova quentinha, bebida ou adicional</p>
              </div>
            </Link>
            <Link href="/admin/configuracoes/negocio" className="admin-link-card">
              <span className="text-2xl">✏️</span>
              <div>
                <p className="font-bold text-slate-800">Editar negócio</p>
                <p className="text-sm text-slate-500">Nome, descrição, logo, horários, WhatsApp</p>
              </div>
            </Link>
            <Link href="/admin/configuracoes/horarios" className="admin-link-card">
              <span className="text-2xl">📅</span>
              <div>
                <p className="font-bold text-slate-800">Dias e horários</p>
                <p className="text-sm text-slate-500">Quando abre, quando fecha, retirada</p>
              </div>
            </Link>
            <Link href="/admin/configuracoes/whatsapp" className="admin-link-card">
              <span className="text-2xl">📱</span>
              <div>
                <p className="font-bold text-slate-800">WhatsApp</p>
                <p className="text-sm text-slate-500">Número que recebe os pedidos</p>
              </div>
            </Link>
          </div>
        </section>

        <PwaSetup />
      </div>
    </AdminLayout>
  );
}