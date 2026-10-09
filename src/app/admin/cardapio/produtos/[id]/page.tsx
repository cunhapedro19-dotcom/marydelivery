import { notFound } from "next/navigation";
import { deleteMealAction, saveMealAction } from "@/app/admin/actions";
import { ActionForm, AdminHeader, ImageField, StatusForm } from "@/components/admin/ui";
import type { MenuItem } from "@/db/schema";
import { getItems, getMeal, getMealComposition, getMealsWithComposition, requireCurrentEstablishment } from "@/lib/data";
import { centsToInput, emojiFor, formatBRL } from "@/lib/format";

type Props = { params: Promise<{ id: string }> };

export default async function MealFormPage({ params }: Props) {
  const { est } = await requireCurrentEstablishment();
  const { id } = await params;
  const isNew = id === "novo";
  const meal = isNew ? null : await getMeal(est.id, Number(id));
  if (!isNew && !meal) notFound();

  const [proteins, sides, composition, allMeals] = await Promise.all([
    getItems(est.id, "protein"),
    getItems(est.id, "side"),
    meal ? getMealComposition(meal.id) : Promise.resolve({ included: [], proteins: [], choices: [] }),
    getMealsWithComposition(est.id, false),
  ]);
  const categories = Array.from(new Set(allMeals.map((m) => m.category.trim()).filter(Boolean)));
  const maxChoices = meal?.maxChoices ?? 2;
  const hasIngredients = proteins.length > 0 || sides.length > 0;

  return (
    <main>
      <AdminHeader title={isNew ? "＋ Novo produto" : "✏️ Editar produto"} back="/admin/cardapio/produtos" />

      <StatusForm action={saveMealAction} submitLabel="Salvar produto">
        {meal && <input type="hidden" name="id" value={meal.id} />}

        {/* ---------- Informações ---------- */}
        <section className="admin-card">
          <h2 className="text-lg font-extrabold">Informações</h2>
          <label className="mt-3 block">
            <span className="label">Nome</span>
            <input className="input" name="name" defaultValue={meal?.name ?? ""} required placeholder="Ex.: Marmita de frango, X-Burger, Pizza grande" />
          </label>
          <label className="mt-4 block">
            <span className="label">Categoria (opcional)</span>
            <input className="input" name="categoryName" list="categorias" defaultValue={meal?.category ?? ""} placeholder="Ex.: Marmitas, Lanches, Porções, Sobremesas" />
            <datalist id="categorias">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <span className="mt-1 block text-xs text-slate-500">Agrupa os produtos no cardápio. Deixe vazio se não precisar.</span>
          </label>
          <label className="mt-4 block">
            <span className="label">Descrição (opcional)</span>
            <textarea className="input min-h-20" name="description" defaultValue={meal?.description ?? ""} placeholder="Uma frase curta para o cliente" />
          </label>
          <label className="mt-4 block">
            <span className="label">Preço</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold text-slate-500">R$</span>
              <input className="input" name="price" inputMode="decimal" defaultValue={centsToInput(meal?.priceCents ?? 0)} placeholder="18,00" />
            </div>
            <span className="mt-1 block text-xs text-slate-500">Valor do produto com tudo que já vem incluso.</span>
          </label>
          <div className="mt-4">
            <ImageField name="imageUrl" label="Foto (opcional)" initialUrl={meal?.imageUrl} hint="Uma foto bonita ajuda a vender. Pode tirar na hora com a câmera." />
          </div>
          <label className="mt-5 flex min-h-14 cursor-pointer items-center justify-between rounded-2xl border-2 border-slate-200 px-4 py-3">
            <span className="font-bold">Disponível no cardápio</span>
            <input type="checkbox" name="available" defaultChecked={meal ? meal.available : true} className="h-7 w-7 accent-admin-600" />
          </label>
        </section>

        {/* ---------- Composição ---------- */}
        <section className="admin-card mt-4">
          <h2 className="text-lg font-extrabold">Composição</h2>
          <p className="mt-1 text-sm text-slate-500">
            Opcional. Marque o que já vem no produto e o que o cliente pode escolher. Cada item só pode estar em um grupo — se marcar nos dois, vale &quot;já vem incluso&quot;.
          </p>
          {!hasIngredients && (
            <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              Você ainda não cadastrou proteínas nem acompanhamentos. Tudo bem: um produto simples (como um lanche ou uma porção) não precisa deles.
            </p>
          )}

          <h3 className="mt-5 font-extrabold">✅ Já vem no produto</h3>
          <p className="mb-2 text-xs text-slate-500">O cliente vê &quot;Já acompanha: ...&quot; e não precisa escolher.</p>
          <CheckList name="included" items={[...proteins, ...sides]} selected={composition.included} showPrice={false} />

          <h3 className="mt-6 font-extrabold">🍗 Cliente escolhe a proteína</h3>
          <p className="mb-2 text-xs text-slate-500">Deixe vazio se a proteína já está definida (marcada acima). Se marcar, o cliente escolhe 1.</p>
          <CheckList name="protein" items={proteins} selected={composition.proteins} showPrice />

          <h3 className="mt-6 font-extrabold">🍚 Cliente escolhe acompanhamentos</h3>
          <p className="mb-2 text-xs text-slate-500">Além do que já vem incluso.</p>
          <CheckList name="choice" items={sides} selected={composition.choices} showPrice />

          <p className="mt-5 font-extrabold">Até quantos acompanhamentos o cliente pode escolher?</p>
          <div className="mt-2 grid grid-cols-7 gap-1.5">
            {[0, 1, 2, 3, 4, 5, 6].map((n) => (
              <label key={n} className="grid min-h-12 cursor-pointer place-items-center rounded-xl border-2 border-slate-200 bg-white text-lg font-extrabold text-slate-700 has-checked:border-admin-600 has-checked:bg-admin-600 has-checked:text-white">
                <input type="radio" name="maxChoices" value={n} defaultChecked={maxChoices === n} className="sr-only" />
                {n}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500">0 = o cliente não escolhe acompanhamentos (só o que já vem incluso).</p>
        </section>

        {/* ---------- Personalização ---------- */}
        <section className="admin-card mt-4">
          <h2 className="text-lg font-extrabold">Personalização</h2>
          <label className="mt-3 flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 border-slate-200 px-4 py-3">
            <span>
              <span className="block font-bold">Permitir adicionais</span>
              <span className="block text-xs text-slate-500">Mostra os adicionais pagos (bacon, ovo...) neste produto.</span>
            </span>
            <input type="checkbox" name="allowExtras" defaultChecked={meal ? meal.allowExtras : true} className="h-7 w-7 shrink-0 accent-admin-600" />
          </label>
          <label className="mt-3 flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 border-slate-200 px-4 py-3">
            <span>
              <span className="block font-bold">Permitir observações</span>
              <span className="block text-xs text-slate-500">O cliente pode escrever &quot;sem cebola&quot;, &quot;pouco sal&quot;...</span>
            </span>
            <input type="checkbox" name="allowNotes" defaultChecked={meal ? meal.allowNotes : true} className="h-7 w-7 shrink-0 accent-admin-600" />
          </label>
        </section>
      </StatusForm>

      {meal && (
        <div className="mt-6">
          <ActionForm action={deleteMealAction.bind(null, meal.id)} confirm={`Excluir o produto "${meal.name}"? Essa ação não pode ser desfeita.`} buttonClassName="btn-danger-soft w-full min-h-14">
            🗑️ Excluir produto
          </ActionForm>
          <p className="mt-2 text-center text-xs text-slate-500">Dica: se for algo temporário, prefira &quot;Desativar&quot; na lista.</p>
        </div>
      )}
    </main>
  );
}

function CheckList({ name, items, selected, showPrice }: { name: string; items: MenuItem[]; selected: number[]; showPrice: boolean }) {
  if (items.length === 0) {
    return <p className="rounded-xl border-2 border-dashed border-slate-200 p-3 text-sm text-slate-500">Nenhum item cadastrado ainda.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <label key={item.id} className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-3 py-2 has-checked:border-admin-600 has-checked:bg-admin-50 ${item.available ? "" : "opacity-70"}`}>
          <input type="checkbox" name={name} value={item.id} defaultChecked={selected.includes(item.id)} className="h-6 w-6 shrink-0 accent-admin-600" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{emojiFor(item.name)} {item.name}</span>
            <span className="block text-[11px] text-slate-500">{!item.available ? "indisponível" : showPrice && item.priceCents > 0 ? `+ ${formatBRL(item.priceCents)}` : ""}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
