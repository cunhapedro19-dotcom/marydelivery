import { redirect } from "next/navigation";
import { getDefaultEstablishment } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const est = await getDefaultEstablishment();
  if (est) redirect(`/${est.slug}`);
  return (
    <main className="min-h-screen flex items-center justify-center bg-cream-100 px-4">
      <div className="text-center">
        <p className="text-4xl">🍲</p>
        <h1 className="mt-4 font-display text-3xl font-bold text-wine-700">Delícias do Barão</h1>
        <p className="mt-2 text-brown-600">Nenhum estabelecimento configurado ainda.</p>
      </div>
    </main>
  );
}