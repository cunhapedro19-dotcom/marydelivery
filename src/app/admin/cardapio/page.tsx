import Link from "next/link";
import { AdminHeader } from "@/components/admin/ui";
import { getItems, getMealsWithComposition, requireCurrentEstablishment } from "@/lib/data";
import { CATEGORY_INFO, CATEGORY_SLUGS, type CategorySlug } from "@/lib/format";

export const metadata = { title: "Cardápio" };

export default async function CardapioPage() {
  const { est } = await requireCurrentEstablishment();
  const slugs = Object.keys(CATEGORY_SLUGS) as CategorySlug[];
  const [mealList, ...lists] = await Promise.all([
    getMealsWithComposition(est.id, false),
    ...slugs.map((s) => getItems(est.id, CATEGORY_SLUGS[s])),
  ]);
  const mealsAvailable = mealList.filter((m) => m.available).length;

  const hints: Partial<Record<CategorySlug, string>> = {
    proteinas: "Usadas dentro dos produtos",
    acompanhamentos: "Inclusos ou à escolha em cada produto",
    adicionais: "Extras pagos, valem para todos os produtos",
  };

  return (
    <main>
      <AdminHeader title="🍽️ Cardápio" back="/admin" subtitle="Toque em uma seção para editar" />

      <Link href="/admin/cardapio/produtos" className="admin-link-card mb-4 !border-admin-600 !bg-admin-50">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-2xl">{est.emoji}</span>
        <span className="min-w-0 flex-1">
          <span className="block">Produtos</span>
          <span className="block text-sm font-normal text-slate-600">{mealsAvailable} de {mealList.length} disponíveis · é o que o cliente escolhe</span>
        </span>
        <span className="text-slate-400">›</span>
      </Link>

      <p className="mb-3 px-1 text-sm text-slate-500">
        Os produtos são montados com os itens abaixo. Proteínas e acompanhamentos são opcionais — uma lanchonete, por exemplo, pode usar só produtos, adicionais e bebidas.
      </p>

      <div className="space-y-3">
        {slugs.map((slug, i) => {
          const info = CATEGORY_INFO[slug];
          const items = lists[i];
          const available = items.filter((x) => x.available).length;
          return (
            <Link key={slug} href={`/admin/cardapio/${slug}`} className="admin-link-card">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-admin-50 text-2xl">{info.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block">{info.plural}</span>
                <span className="block text-sm font-normal text-slate-500">
                  {available} de {items.length} disponíveis
                  {slug === "bebidas" && (est.drinkRequired ? " · obrigatória" : " · opcional")}
                  {hints[slug] ? ` · ${hints[slug]}` : ""}
                </span>
              </span>
              <span className="text-slate-400">›</span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
