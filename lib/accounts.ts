import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { findUserByEmail, insertUser, type UserRecord } from "./store";

export const MIN_PASSWORD_LENGTH = 8;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const given = scryptSync(password, salt, expected.length);
  return timingSafeEqual(expected, given);
}

export type AuthResult =
  | { ok: true; user: UserRecord }
  | { ok: false; error: string };

export function signUpUser(rawEmail: string, password: string): AuthResult {
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  if (findUserByEmail(email)) {
    return { ok: false, error: "An account with this email already exists." };
  }
  return { ok: true, user: insertUser(email, hashPassword(password)) };
}

export function signInUser(rawEmail: string, password: string): AuthResult {
  const user = findUserByEmail(rawEmail.trim().toLowerCase());
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { ok: false, error: "Incorrect email or password." };
  }
  return { ok: true, user };
}
