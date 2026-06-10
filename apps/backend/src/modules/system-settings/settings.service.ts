import { DEFAULT_SETTINGS } from "@zahira/shared";
import { prisma } from "../../lib/prisma.js";

type SettingsMap = Record<string, unknown>;

let cache: SettingsMap | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 30_000;

/** Returns all settings merged over defaults, with a short in-process cache. */
export async function getSettings(): Promise<SettingsMap> {
  const now = Date.now();
  if (cache && now < cacheExpiry) return cache;

  const rows = await prisma.systemSetting.findMany();
  const overrides: SettingsMap = {};
  for (const row of rows) overrides[row.key] = row.value;

  cache = { ...DEFAULT_SETTINGS, ...overrides };
  cacheExpiry = now + CACHE_TTL_MS;
  return cache;
}

export async function getNumber(key: string, fallback: number): Promise<number> {
  const settings = await getSettings();
  const value = settings[key];
  return typeof value === "number" ? value : fallback;
}

export async function getValue<T>(key: string, fallback: T): Promise<T> {
  const settings = await getSettings();
  const value = settings[key];
  return value === undefined ? fallback : (value as T);
}

export async function updateSettings(patch: SettingsMap): Promise<SettingsMap> {
  await prisma.$transaction(
    Object.entries(patch).map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        create: { key, value: value as object },
        update: { value: value as object },
      }),
    ),
  );
  cache = null;
  return getSettings();
}

export function invalidateSettingsCache() {
  cache = null;
}
