import { cookies } from "next/headers";
import { login } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Usuário e senha são obrigatórios" }, { status: 400 });
    }
    const result = await login(username.trim().toLowerCase(), password);
    if (!result) {
      return NextResponse.json({ error: "Usuário ou senha inválidos" }, { status: 401 });
    }
    return NextResponse.json({ ok: true, establishmentId: result.establishmentId });
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}