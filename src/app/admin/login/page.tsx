"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminLayout } from "@/components/admin/ui";
import { Label, Input, SubmitButton } from "@/components/admin/ui";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/admin";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro no login");
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout title="Entrar no painel">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="font-display text-2xl font-bold text-center text-slate-900">Entrar no painel</h1>
          <p className="mt-2 text-center text-sm text-slate-500">Delícias do Barão — Painel administrativo</p>

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm font-medium text-red-700" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="username">Usuário</Label>
              <Input id="username" type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="admin" required disabled={loading} />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required disabled={loading} />
            </div>
            <SubmitButton type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </SubmitButton>
          </form>

          <p className="mt-4 text-center text-xs text-slate-500">
            Usuário padrão: <code className="font-mono">admin</code> • Senha padrão: <code className="font-mono">barao-2026</code>
          </p>
          <p className="mt-1 text-center text-xs text-slate-500">
            Troque a senha em Configurações → Meu acesso após o primeiro login.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}