import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
};

export type ResumeRecord = {
  id: string;
  ownerId: string;
  title: string;
  createdAt: string;
};

type Db = { users: UserRecord[]; resumes: ResumeRecord[] };

const dbPath = () => process.env.DATA_FILE ?? ".data/db.json";

function load(): Db {
  try {
    return JSON.parse(readFileSync(/*turbopackIgnore: true*/ dbPath(), "utf8")) as Db;
  } catch {
    return { users: [], resumes: [] };
  }
}

function save(db: Db) {
  mkdirSync(dirname(dbPath()), { recursive: true });
  writeFileSync(dbPath(), JSON.stringify(db));
}

export function findUserByEmail(email: string): UserRecord | undefined {
  return load().users.find((u) => u.email === email);
}

export function findUserById(id: string): UserRecord | undefined {
  return load().users.find((u) => u.id === id);
}

export function insertUser(email: string, passwordHash: string): UserRecord {
  const db = load();
  const user = { id: randomUUID(), email, passwordHash };
  db.users.push(user);
  save(db);
  return user;
}

// Every resume read is filtered by owner: there is no unfiltered accessor.
export function listResumes(ownerId: string): ResumeRecord[] {
  return load().resumes.filter((r) => r.ownerId === ownerId);
}

export function insertResume(ownerId: string, title: string): ResumeRecord {
  const db = load();
  const resume = {
    id: randomUUID(),
    ownerId,
    title,
    createdAt: new Date().toISOString(),
  };
  db.resumes.push(resume);
  save(db);
  return resume;
}
