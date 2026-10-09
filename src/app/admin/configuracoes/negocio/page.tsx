import { saveBusinessAction } from "@/app/admin/actions";
import { PublicLink } from "@/components/admin/settings-widgets";
import { AdminHeader, ImageField, StatusForm } from "@/components/admin/ui";
import { requireCurrentEstablishment } from "@/lib/data";

export const metadata = { title: "Dados do negócio" };

export default async function NegocioPage() {
  const { est } = await requireCurrentEstablishment();

  return (
    <main>
      <AdminHeader title="🏪 Dados do negócio" back="/admin/configuracoes" />

      <div className="mb-4">
        <PublicLink slug={est.slug} />
      </div>

      <div className="admin-card">
        <StatusForm action={saveBusinessAction} submitLabel="Salvar dados do negócio">
          <div className="grid grid-cols-[5rem_1fr] gap-3">
            <label className="block">
              <span className="label">Ícone</span>
              <input className="input text-center text-2xl" name="emoji" defaultValue={est.emoji} maxLength={8} />
            </label>
            <label className="block">
              <span className="label">Nome do negócio</span>
              <input className="input" name="name" defaultValue={est.name} required />
            </label>
          </div>
          <p className="mt-1 text-xs text-slate-500">O ícone aparece no cabeçalho da mensagem do pedido (ex.: 🍔 NOVO PEDIDO).</p>

          <label className="mt-4 block">
            <span className="label">Endereço do cardápio (link)</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-500">/</span>
              <input className="input" name="slug" defaultValue={est.slug} pattern="[a-z0-9-]{3,40}" placeholder="meu-negocio" />
            </div>
            <span className="mt-1 block text-xs text-slate-500">
              Só letras minúsculas, números e hífens. Se mudar, o link antigo deixa de funcionar — avise seus clientes.
            </span>
          </label>

          <label className="mt-4 block">
            <span className="label">Descrição curta</span>
            <textarea className="input min-h-20" name="description" defaultValue={est.description} placeholder="Ex.: Comida caseira feita com carinho." />
          </label>
          <div className="mt-4">
            <ImageField name="logoUrl" label="Logo (opcional)" initialUrl={est.logoUrl} heightClass="h-28" hint="Aparece pequena ao lado do nome." />
          </div>
          <div className="mt-4">
            <ImageField name="heroUrl" label="Imagem principal" initialUrl={est.heroUrl} hint="A foto grande que aparece na primeira tela do cardápio." />
          </div>
        </StatusForm>
      </div>
    </main>
  );
}
