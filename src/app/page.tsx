import { redirect } from "next/navigation";
import { getDefaultEstablishment } from "@/lib/data";

export const dynamic = "force-dynamic";

/** A raiz do site abre o cardápio do estabelecimento padrão. Cada estabelecimento tem seu próprio link: /nome-do-negocio */
export default async function RootPage() {
  const est = await getDefaultEstablishment();
  if (est) redirect(`/${est.slug}`);

  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="text-5xl">🍽️</p>
        <h1 className="mt-4 text-2xl font-extrabold">Nenhum estabelecimento cadastrado ainda.</h1>
        <p className="mt-2 text-white/70">Crie o primeiro com o script de configuração (veja o README).</p>
      </div>
    </main>
  );
}
