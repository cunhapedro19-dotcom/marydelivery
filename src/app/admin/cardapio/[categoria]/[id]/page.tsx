import { notFound } from "next/navigation";
import { deleteItemAction, saveItemAction } from "@/app/admin/actions";
import { ActionForm, AdminHeader, ImageField, StatusForm } from "@/components/admin/ui";
import { getItem, requireCurrentEstablishment } from "@/lib/data";
import { CATEGORY_INFO, CATEGORY_SLUGS, centsToInput, type CategorySlug } from "@/lib/format";

type Props = { params: Promise<{ categoria: string; id: string }> };

export default async function ItemFormPage({ params }: Props) {
  const { est } = await requireCurrentEstablishment();
  const { categoria, id } = await params;
  if (!(categoria in CATEGORY_SLUGS)) notFound();
  const slug = categoria as CategorySlug;
  const info = CATEGORY_INFO[slug];

  const isNew = id === "novo";
  const item = isNew ? null : await getItem(est.id, Number(id));
  if (!isNew && (!item || item.category !== CATEGORY_SLUGS[slug])) notFound();

  return (
    <main>
      <AdminHeader
        title={isNew ? `＋ Nova ${info.singular}` : `✏️ Editar ${info.singular}`}
        back={`/admin/cardapio/${slug}`}
      />

      <div className="admin-card">
        <StatusForm action={saveItemAction} submitLabel="Salvar">
          <input type="hidden" name="category" value={slug} />
          {item && <input type="hidden" name="id" value={item.id} />}

          <label className="block">
            <span className="label">Nome</span>
            <input className="input" name="name" defaultValue={item?.name ?? ""} required placeholder={`Ex.: ${slug === "proteinas" ? "Frango grelhado" : slug === "acompanhamentos" ? "Arroz" : slug === "adicionais" ? "Ovo" : "Suco natural"}`} />
          </label>

          <label className="mt-4 block">
            <span className="label">Descrição (opcional)</span>
            <textarea className="input min-h-20" name="description" defaultValue={item?.description ?? ""} placeholder="Uma frase curta sobre o item" />
          </label>

          <label className="mt-4 block">
            <span className="label">{info.priceLabel}</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold text-slate-500">R$</span>
              <input className="input" name="price" inputMode="decimal" defaultValue={centsToInput(item?.priceCents ?? 0)} placeholder="0,00" />
            </div>
            <span className="mt-1 block text-xs text-slate-500">{info.priceHint}</span>
          </label>

          <div className="mt-4">
            <ImageField name="imageUrl" label="Foto (opcional)" initialUrl={item?.imageUrl} hint="Uma foto bonita ajuda a vender. Pode tirar na hora com a câmera." />
          </div>

          <label className="mt-5 flex min-h-14 cursor-pointer items-center justify-between rounded-2xl border-2 border-slate-200 px-4 py-3">
            <span className="font-bold">Disponível no cardápio</span>
            <input type="checkbox" name="available" defaultChecked={item ? item.available : true} className="h-7 w-7 accent-admin-600" />
          </label>
        </StatusForm>
      </div>

      {item && (
        <div className="mt-6">
          <ActionForm
            action={deleteItemAction.bind(null, item.id, slug)}
            confirm={`Excluir "${item.name}"? Essa ação não pode ser desfeita.`}
            buttonClassName="btn-danger-soft w-full min-h-14"
          >
            🗑️ Excluir {info.singular}
          </ActionForm>
          <p className="mt-2 text-center text-xs text-slate-500">
            Dica: se for algo temporário, prefira &quot;Desativar&quot; na lista.
          </p>
        </div>
      )}
    </main>
  );
}
