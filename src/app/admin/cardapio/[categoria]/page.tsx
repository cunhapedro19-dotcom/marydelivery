import Link from "next/link";
import { notFound } from "next/navigation";
import { moveItemAction, setDrinkRequiredAction, toggleItemAction } from "@/app/admin/actions";
import { ActionForm, AdminHeader } from "@/components/admin/ui";
import { getItems, requireCurrentEstablishment } from "@/lib/data";
import { CATEGORY_INFO, CATEGORY_SLUGS, formatBRL, type CategorySlug } from "@/lib/format";

type Props = {
  params: Promise<{ categoria: string }>;
  searchParams: Promise<{ salvo?: string; excluido?: string }>;
};

export default async function CategoriaPage({ params, searchParams }: Props) {
  const { est } = await requireCurrentEstablishment();
  const { categoria } = await params;
  const { salvo, excluido } = await searchParams;
  if (!(categoria in CATEGORY_SLUGS)) notFound();
  const slug = categoria as CategorySlug;
  const info = CATEGORY_INFO[slug];
  const items = await getItems(est.id, CATEGORY_SLUGS[slug]);
  const config = est;

  return (
    <main>
      <AdminHeader title={`${info.emoji} ${info.plural}`} back="/admin/cardapio" />

      {salvo && <p className="mb-4 rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold text-green-800">✅ Salvo com sucesso!</p>}
      {excluido && <p className="mb-4 rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold text-green-800">🗑️ Item excluído.</p>}

      {(slug === "acompanhamentos" || slug === "proteinas") && (
        <p className="mb-4 rounded-2xl border border-admin-100 bg-admin-50 p-4 text-sm text-admin-800">
          {slug === "acompanhamentos"
            ? "Aqui você cadastra os acompanhamentos. Quais já vêm inclusos, quais o cliente pode escolher e o limite de escolhas são definidos em cada produto, em "
            : "Aqui você cadastra as proteínas. Em qual produto cada uma aparece (inclusa ou à escolha do cliente) é definido em "}
          <Link href="/admin/cardapio/produtos" className="font-bold underline">
            Cardápio → Produtos
          </Link>
          .
        </p>
      )}

      {slug === "bebidas" && (
        <section className="admin-card mb-4">
          <p className="font-extrabold">A bebida é {config.drinkRequired ? "obrigatória" : "opcional"}</p>
          <p className="mt-1 text-sm text-slate-500">
            {config.drinkRequired ? "O cliente precisa escolher uma bebida." : "O cliente pode pedir sem bebida."}
          </p>
          <form action={setDrinkRequiredAction} className="mt-3 grid grid-cols-2 gap-2">
            {[
              { v: "0", label: "Opcional" },
              { v: "1", label: "Obrigatória" },
            ].map((opt) => (
              <button
                key={opt.v}
                type="submit"
                name="drinkRequired"
                value={opt.v}
                className={`min-h-12 rounded-xl border-2 font-extrabold transition active:scale-95 ${
                  (config.drinkRequired ? "1" : "0") === opt.v ? "border-admin-600 bg-admin-600 text-white" : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </form>
        </section>
      )}

      <Link href={`/admin/cardapio/${slug}/novo`} className="btn-admin mb-4">
        ＋ Adicionar {info.singular}
      </Link>

      {items.length === 0 && (
        <p className="rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center text-slate-500">
          Nenhum item ainda. Toque em &quot;Adicionar&quot; para criar o primeiro.
        </p>
      )}

      <ul className="space-y-3">
        {items.map((item, index) => (
          <li key={item.id} className={`admin-card !p-4 ${item.available ? "" : "opacity-80"}`}>
            <div className="flex items-start gap-3">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
              ) : (
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-slate-100 text-2xl">{info.emoji}</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-lg font-extrabold leading-tight">{item.name}</p>
                <p className="text-slate-600">{item.priceCents > 0 ? formatBRL(item.priceCents) : slug === "acompanhamentos" ? "Incluso" : "Grátis"}</p>
                <p className={`mt-1 text-sm font-bold ${item.available ? "text-green-700" : "text-red-600"}`}>
                  {item.available ? "🟢 Disponível" : "🔴 Indisponível"}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <ActionForm action={moveItemAction.bind(null, item.id, "up")} buttonClassName="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-lg disabled:opacity-40">
                  {index === 0 ? <span className="opacity-30">↑</span> : "↑"}
                </ActionForm>
                <ActionForm action={moveItemAction.bind(null, item.id, "down")} buttonClassName="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-lg disabled:opacity-40">
                  {index === items.length - 1 ? <span className="opacity-30">↓</span> : "↓"}
                </ActionForm>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href={`/admin/cardapio/${slug}/${item.id}`} className="btn-admin-soft">
                ✏️ Editar
              </Link>
              <ActionForm
                action={toggleItemAction.bind(null, item.id)}
                buttonClassName={item.available ? "btn-danger-soft w-full" : "btn-admin-soft w-full !bg-green-50 !text-green-800"}
              >
                {item.available ? "Desativar" : "Ativar"}
              </ActionForm>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
