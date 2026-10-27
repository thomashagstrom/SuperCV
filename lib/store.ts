import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
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
  company?: string;
  matched?: number;
  createdAt: string;
};

type StoredUser = User & { passwordHash: string };
type Data = {
  users: StoredUser[];
  sessions: Record<string, string>;
  resumes: Resume[];
};

const SESSION_TOKEN_BYTES = 32;
const REMOTE_KEY = "loomshift:store";

function filePath() {
  return resolve(
    /*turbopackIgnore: true*/ process.env.LOOMSHIFT_DATA_FILE ??
      ".data/store.json",
  );
}

// Read on every call, so the running service's environment picks the store.
function remote() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function command(
  r: { url: string; token: string },
  args: string[],
): Promise<string | null> {
  const res = await fetch(r.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${r.token}` },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Remote store responded ${res.status}`);
  return ((await res.json()) as { result: string | null }).result;
}

function empty(): Data {
  return { users: [], sessions: {}, resumes: [] };
}

async function load(): Promise<Data> {
  const r = remote();
  if (r) {
    const raw = await command(r, ["GET", REMOTE_KEY]);
    return raw ? (JSON.parse(raw) as Data) : empty();
  }
  try {
    return JSON.parse(
      await readFile(/*turbopackIgnore: true*/ filePath(), "utf8"),
    ) as Data;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return empty();
    throw e;
  }
}

async function save(data: Data) {
  const r = remote();
  if (r) {
    await command(r, ["SET", REMOTE_KEY, JSON.stringify(data)]);
    return;
  }
  const path = filePath();
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(data));
  await rename(tmp, path);
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

export async function signUp(email: string, password: string): Promise<User> {
  const data = await load();
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
  await save(data);
  return { id: user.id, email: user.email };
}

export async function verifyCredentials(email: string, password: string) {
  const user = (await load()).users.find((u) => u.email === normalizeEmail(email));
  if (!user || !checkPassword(password, user.passwordHash)) return null;
  return { id: user.id, email: user.email };
}

export async function createSession(userId: string) {
  const data = await load();
  const token = randomBytes(SESSION_TOKEN_BYTES).toString("hex");
  data.sessions[token] = userId;
  await save(data);
  return token;
}

export async function getUserBySession(
  token: string | undefined,
): Promise<User | null> {
  if (!token) return null;
  const data = await load();
  const userId = data.sessions[token];
  const user = data.users.find((u) => u.id === userId);
  return user ? { id: user.id, email: user.email } : null;
}

export async function deleteSession(token: string) {
  const data = await load();
  delete data.sessions[token];
  await save(data);
}

// Every resume query takes the owner's id and filters on it.
export async function listResumes(userId: string): Promise<Resume[]> {
  return (await load()).resumes.filter((r) => r.userId === userId);
}

export async function getResume(
  userId: string,
  id: string,
): Promise<Resume | null> {
  return (
    (await load()).resumes.find((r) => r.id === id && r.userId === userId) ??
    null
  );
}

export async function createResume(
  userId: string,
  title: string,
  content: string,
): Promise<Resume> {
  const data = await load();
  const resume: Resume = {
    id: randomUUID(),
    userId,
    title,
    content,
    createdAt: new Date().toISOString(),
    tailored: [],
  };
  data.resumes.push(resume);
  await save(data);
  return resume;
}

export async function renameResume(
  userId: string,
  id: string,
  title: string,
): Promise<Resume | null> {
  const data = await load();
  const resume = data.resumes.find((r) => r.id === id && r.userId === userId);
  if (!resume) return null;
  resume.title = title;
  await save(data);
  return resume;
}

export async function deleteResume(
  userId: string,
  id: string,
): Promise<boolean> {
  const data = await load();
  const index = data.resumes.findIndex(
    (r) => r.id === id && r.userId === userId,
  );
  if (index === -1) return false;
  data.resumes.splice(index, 1);
  await save(data);
  return true;
}

export async function addTailoredVersion(
  userId: string,
  resumeId: string,
  target: string,
  content: string,
  meta: { company?: string; matched?: number } = {},
): Promise<TailoredVersion | null> {
  const data = await load();
  const resume = data.resumes.find(
    (r) => r.id === resumeId && r.userId === userId,
  );
  if (!resume) return null;
  const version = {
    id: randomUUID(),
    target,
    content,
    ...meta,
    createdAt: new Date().toISOString(),
  };
  resume.tailored.push(version);
  await save(data);
  return version;
}
