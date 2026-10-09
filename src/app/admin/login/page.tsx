import { redirect } from "next/navigation";
import { loginAction } from "@/app/admin/actions";
import { StatusForm } from "@/components/admin/ui";
import { ensureSeeded } from "@/db/seed";
import { getAdminSession } from "@/lib/auth";
import { getDefaultEstablishment } from "@/lib/data";

export const metadata = { title: "Entrar" };

export default async function LoginPage() {
  // Garante que o acesso do painel existe (o seed cria tudo na primeira visita)
  await ensureSeeded();
  const session = await getAdminSession();
  if (session) redirect("/admin");
  const est = await getDefaultEstablishment();

  return (
    <main className="flex min-h-dvh flex-col justify-center py-10">
      <div className="mb-8 text-center">
        <img src="/icons/icon-192.png" alt="" className="mx-auto h-20 w-20 rounded-3xl shadow-md" />
        <h1 className="mt-4 text-2xl font-extrabold">{est ? `${est.emoji} ${est.name}` : "🍔 Mary Delivery"}</h1>
        <p className="mt-1 text-slate-600">Entre para administrar o seu cardápio.</p>
      </div>

      <div className="admin-card">
        <StatusForm action={loginAction} submitLabel="Entrar">
          <label className="block">
            <span className="label">Usuário</span>
            <input className="input" type="text" name="identifier" autoComplete="username" required />
          </label>
          <label className="mt-4 block">
            <span className="label">Senha</span>
            <input className="input" type="password" name="password" autoComplete="current-password" required />
          </label>
        </StatusForm>
      </div>
    </main>
  );
}
