import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { userFilterPreferences, type UserFilterPreferences } from "../db/schema";
import type { Env } from "../bindings";

export type FilterPreferences = {
  autoApply: boolean;
  soloNoVistos: boolean;
};

export const DEFAULT_FILTER_PREFERENCES: FilterPreferences = {
  autoApply: true,
  soloNoVistos: true,
};

function decodePreferences(row: UserFilterPreferences | undefined): FilterPreferences {
  if (!row) return { ...DEFAULT_FILTER_PREFERENCES };

  return {
    autoApply: row.autoApply,
    soloNoVistos: row.soloNoVistos,
  };
}

function encodePreferences(preferences: FilterPreferences) {
  return {
    autoApply: preferences.autoApply,
    soloNoVistos: preferences.soloNoVistos,
    tipo: "[]",
    tipoExcluir: "[]",
    genero: "[]",
    generoExcluir: "[]",
    tag: "[]",
    tagExcluir: "[]",
  };
}

export async function getStoredFilterPreferences(env: Env, email: string): Promise<UserFilterPreferences | undefined> {
  const db = getDb(env.DB);
  const [row] = await db.select().from(userFilterPreferences).where(eq(userFilterPreferences.email, email));
  return row;
}

export async function saveFilterPreferences(env: Env, email: string, preferences: FilterPreferences): Promise<void> {
  const db = getDb(env.DB);
  const now = new Date();
  const payload = encodePreferences(preferences);
  const existing = await getStoredFilterPreferences(env, email);

  if (existing) {
    await db
      .update(userFilterPreferences)
      .set({
        ...payload,
        updatedAt: now,
      })
      .where(eq(userFilterPreferences.email, email));
    return;
  }

  await db.insert(userFilterPreferences).values({
    email,
    ...payload,
    createdAt: now,
    updatedAt: now,
  });
}

export async function getFilterPreferences(env: Env, email: string): Promise<FilterPreferences> {
  const stored = await getStoredFilterPreferences(env, email);
  return decodePreferences(stored);
}
