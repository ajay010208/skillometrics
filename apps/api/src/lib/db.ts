import type { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | null = null;
export function getPrisma(): PrismaClient {
  if (!prisma) throw new Error("Prisma not initialized");
  return prisma;
}
export function setPrisma(p: PrismaClient) {
  prisma = p;
}

export interface AuthedRequest {
  profile?: { id: string; email: string; name: string; role: string } | null;
}

// ---- JSON helpers (SQLite-safe JSON columns) ----
export function jparse<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
export function jstring(v: unknown): string {
  return JSON.stringify(v ?? null);
}
