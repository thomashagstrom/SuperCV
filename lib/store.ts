import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type User = { id: string; email: string };
export type Resume = {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  tailored: TailoredVersion[];
};
export type TailoredVersion = {
  id: string;
  target: string;
  content: string;
  createdAt: string;
};

type StoredUser = User & { passwordHash: string };
type Data = {
  users: StoredUser[];
  sessions: Record<string, string>;
  resumes: Resume[];
};

const SESSION_TOKEN_BYTES = 32;

function filePath() {
  return resolve(
    /*turbopackIgnore: true*/ process.env.LOOMSHIFT_DATA_FILE ??
      ".data/store.json",
  );
}

function load(): Data {
  try {
    return JSON.parse(readFileSync(/*turbopackIgnore: true*/ filePath(), "utf8")) as Data;
  } catch {
    return { users: [], sessions: {}, resumes: [] };
  }
}

function save(data: Data) {
  const path = filePath();
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(data));
  renameSync(tmp, path);
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function checkPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function signUp(email: string, password: string): User {
  const data = load();
  const normalized = normalizeEmail(email);
  if (data.users.some((u) => u.email === normalized)) {
    throw new Error("An account with this email already exists.");
  }
  const user = {
    id: randomUUID(),
    email: normalized,
    passwordHash: hashPassword(password),
  };
  data.users.push(user);
  save(data);
  return { id: user.id, email: user.email };
}

export function verifyCredentials(email: string, password: string) {
  const user = load().users.find((u) => u.email === normalizeEmail(email));
  if (!user || !checkPassword(password, user.passwordHash)) return null;
  return { id: user.id, email: user.email };
}

export function createSession(userId: string) {
  const data = load();
  const token = randomBytes(SESSION_TOKEN_BYTES).toString("hex");
  data.sessions[token] = userId;
  save(data);
  return token;
}

export function getUserBySession(token: string | undefined): User | null {
  if (!token) return null;
  const data = load();
  const userId = data.sessions[token];
  const user = data.users.find((u) => u.id === userId);
  return user ? { id: user.id, email: user.email } : null;
}

export function deleteSession(token: string) {
  const data = load();
  delete data.sessions[token];
  save(data);
}

// Every resume query takes the owner's id and filters on it.
export function listResumes(userId: string): Resume[] {
  return load().resumes.filter((r) => r.userId === userId);
}

export function getResume(userId: string, id: string): Resume | null {
  return (
    load().resumes.find((r) => r.id === id && r.userId === userId) ?? null
  );
}

export function createResume(
  userId: string,
  title: string,
  content: string,
): Resume {
  const data = load();
  const resume: Resume = {
    id: randomUUID(),
    userId,
    title,
    content,
    createdAt: new Date().toISOString(),
    tailored: [],
  };
  data.resumes.push(resume);
  save(data);
  return resume;
}

export function addTailoredVersion(
  userId: string,
  resumeId: string,
  target: string,
  content: string,
): TailoredVersion | null {
  const data = load();
  const resume = data.resumes.find(
    (r) => r.id === resumeId && r.userId === userId,
  );
  if (!resume) return null;
  const version = {
    id: randomUUID(),
    target,
    content,
    createdAt: new Date().toISOString(),
  };
  resume.tailored.push(version);
  save(data);
  return version;
}
