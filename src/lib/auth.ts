import "server-only";
import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { and, eq, gt, or } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers, sessions } from "@/db/schema";
import { DEFAULT_ADMIN_PASSWORD } from "@/db/seed";
import { hashPassword, verifyPassword } from "@/lib/password";

export { hashPassword, verifyPassword, DEFAULT_ADMIN_PASSWORD };

export const SESSION_COOKIE = "cardapio_admin_sessao";
const SESSION_DAYS = 30;

async function isSecureRequest(): Promise<boolean> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim() === "https";
  return process.env.NODE_ENV === "production" && !!process.env.VERCEL;
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ token, userId, expiresAt });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: await isSecureRequest(),
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  store.delete(SESSION_COOKIE);
}

/** Sessão da pessoa logada. */
export type AdminSession = {
  userId: number;
  username: string;
  email: string | null;
  establishmentId: number;
};

export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({
      userId: sessions.userId,
      username: adminUsers.username,
      email: adminUsers.email,
      establishmentId: adminUsers.establishmentId,
    })
    .from(sessions)
    .innerJoin(adminUsers, eq(adminUsers.id, sessions.userId))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
});

/** Garante que existe alguém logado. Redireciona para o login se não houver. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

/** Busca o usuário pelo nome de usuário OU pelo e-mail (se algum dia for cadastrado). */
export async function authenticate(identifier: string, password: string) {
  const id = identifier.trim().toLowerCase();
  const user = await db
    .select()
    .from(adminUsers)
    .where(or(eq(adminUsers.username, id), eq(adminUsers.email, id)))
    .limit(1);
  const found = user[0];
  if (!found || !verifyPassword(password, found.passwordHash)) return null;
  return found;
}

/** O usuário logado ainda usa a senha inicial? (para avisar na tela inicial do painel) */
export async function currentUserHasDefaultPassword(userId: number): Promise<boolean> {
  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, userId));
  return !!user && verifyPassword(DEFAULT_ADMIN_PASSWORD, user.passwordHash);
}
