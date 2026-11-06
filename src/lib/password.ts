import { createHash, randomBytes, timingSafeEqual } from "crypto";

const ITERATIONS = 100_000;
const KEY_LENGTH = 32;
const ALGORITHM = "sha256";

/** Gera hash PBKDF2 (salt:hash em hex, separado por dois pontos). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = createHash(ALGORITHM)
    .update(password)
    .update(salt)
    .digest();
  let derived = Buffer.from(password);
  for (let i = 0; i < ITERATIONS; i++) {
    derived = createHash(ALGORITHM).update(derived).update(salt).digest();
  }
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

/** Verifica senha contra hash no formato salt:hash. */
export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  let derived = Buffer.from(password);
  for (let i = 0; i < ITERATIONS; i++) {
    derived = createHash(ALGORITHM).update(derived).update(salt).digest();
  }
  return timingSafeEqual(derived, expected);
}