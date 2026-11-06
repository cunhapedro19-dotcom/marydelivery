import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers, sessions } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { notFound } from "next/navigation";

export type AdminSession = {
  userId: number;
  establishmentId: number;
  username: string;
};

const SESSION_COOKIE = "admin_session";
const SESSION_DAYS = 30;

/** Cria sessão e define cookie httpOnly. */
export async function createSession(userId: number, establishmentId: number, username: string) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ token, userId, expiresAt });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: "/",
  });
}

/** Lê sessão do cookie (retorna null se inválida/expirada). */
export async function getSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ userId: sessions.userId, establishmentId: adminUsers.establishmentId, username: adminUsers.username })
    .from(sessions)
    .innerJoin(adminUsers, eq(adminUsers.id, sessions.userId))
    .where(eq(sessions.token, token))
    .limit(1);
  if (rows.length === 0) return null;
  const { userId, establishmentId, username } = rows[0];
  if (new Date() > new Date((await db.select({ expiresAt: sessions.expiresAt }).from(sessions).where(eq(sessions.token, token)).limit(1))[0]?.expiresAt ?? 0)) {
    await db.delete(sessions).where(eq(sessions.token, token));
    return null;
  }
  return { userId, establishmentId, username };
}

/** Exige sessão válida (lança notFound se não tiver). */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getSession();
  if (!session) notFound();
  return session;
}

/** Remove sessão (logout). */
export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
    cookieStore.delete(SESSION_COOKIE);
  }
}

/** Verifica credenciais e cria sessão se ok. */
export async function login(username: string, password: string): Promise<{ establishmentId: number } | null> {
  const rows = await db
    .select({ id: adminUsers.id, establishmentId: adminUsers.establishmentId, passwordHash: adminUsers.passwordHash })
    .from(adminUsers)
    .where(eq(adminUsers.username, username.toLowerCase()))
    .limit(1);
  if (rows.length === 0) return null;
  const { id, establishmentId, passwordHash } = rows[0];
  if (!verifyPassword(password, passwordHash)) return null;
  await createSession(id, establishmentId, username.toLowerCase());
  return { establishmentId };
}