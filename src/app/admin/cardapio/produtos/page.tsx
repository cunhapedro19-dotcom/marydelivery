import Link from "next/link";
import { moveMealAction, toggleMealAction } from "@/app/admin/actions";
import { ActionForm, AdminHeader } from "@/components/admin/ui";
import { getMealsWithComposition, requireCurrentEstablishment } from "@/lib/data";
import { formatBRL } from "@/lib/format";

export const metadata = { title: "Produtos" };

type Props = { searchParams: Promise<{ salvo?: string; excluido?: string }> };

export default async function ProdutosPage({ searchParams }: Props) {
  const { est } = await requireCurrentEstablishment();
  const { salvo, excluido } = await searchParams;
  const mealList = await getMealsWithComposition(est.id, false);

  return (
    <main>
      <AdminHeader title={`${est.emoji} Produtos`} back="/admin/cardapio" subtitle="O que o cliente escolhe no cardápio" />

      {salvo && <p className="mb-4 rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold text-green-800">✅ Produto salvo com sucesso!</p>}
      {excluido && <p className="mb-4 rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold text-green-800">🗑️ Produto excluído.</p>}

      <Link href="/admin/cardapio/produtos/novo" className="btn-admin mb-4">
        ＋ Adicionar produto
      </Link>

      {mealList.length === 0 && (
        <p className="rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center text-slate-500">
          Nenhum produto ainda. Toque em &quot;Adicionar produto&quot; para criar o primeiro.
        </p>
      )}

      <ul className="space-y-3">
        {mealList.map((meal, index) => {
          const summary: string[] = [];
          if (meal.included.length) summary.push(`Inclui: ${meal.included.map((i) => i.name).join(", ")}`);
          if (meal.proteins.length) summary.push(`Proteína à escolha: ${meal.proteins.map((i) => i.name).join(", ")}`);
          if (meal.choices.length && meal.maxChoices > 0) {
            summary.push(`Escolhe até ${meal.maxChoices}: ${meal.choices.map((i) => i.name).join(", ")}`);
          }
          const flags = [meal.allowExtras ? "Adicionais ✓" : "Sem adicionais", meal.allowNotes ? "Observações ✓" : "Sem observações"];
          return (
            <li key={meal.id} className={`admin-card !p-4 ${meal.available ? "" : "opacity-80"}`}>
              <div className="flex items-start gap-3">
                {meal.imageUrl ? (
                  <img src={meal.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-slate-100 text-2xl">{est.emoji}</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-extrabold leading-tight">{meal.name}</p>
                  {meal.category && <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{meal.category}</p>}
                  <p className="text-slate-600">{formatBRL(meal.priceCents)}</p>
                  <p className={`mt-1 text-sm font-bold ${meal.available ? "text-green-700" : "text-red-600"}`}>
                    {meal.available ? "🟢 Disponível" : "🔴 Indisponível"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <ActionForm action={moveMealAction.bind(null, meal.id, "up")} buttonClassName="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-lg">
                    {index === 0 ? <span className="opacity-30">↑</span> : "↑"}
                  </ActionForm>
                  <ActionForm action={moveMealAction.bind(null, meal.id, "down")} buttonClassName="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-lg">
                    {index === mealList.length - 1 ? <span className="opacity-30">↓</span> : "↓"}
                  </ActionForm>
                </div>
              </div>

              <div className="mt-3 space-y-0.5 text-sm text-slate-600">
                {summary.length === 0 && <p className="text-slate-500">Produto simples (sem itens inclusos ou à escolha).</p>}
                {summary.map((s) => (
                  <p key={s}>{s}</p>
                ))}
                <p className="text-xs text-slate-500">{flags.join(" · ")}</p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href={`/admin/cardapio/produtos/${meal.id}`} className="btn-admin-soft">
                  ✏️ Editar
                </Link>
                <ActionForm
                  action={toggleMealAction.bind(null, meal.id)}
                  buttonClassName={meal.available ? "btn-danger-soft w-full" : "btn-admin-soft w-full !bg-green-50 !text-green-800"}
                >
                  {meal.available ? "Desativar" : "Ativar"}
                </ActionForm>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
