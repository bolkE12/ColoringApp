import { Asset } from "expo-asset";
// Uses fetch() on the local asset URI to avoid deprecated FileSystem APIs
import {
  HYBRID_SOURCES,
  RAW_HYBRID_LOOKUP
} from "../../assets/hybrid";
import * as BASE from "../../assets/base";

// Some projects export different names from assets/base. Normalize them here.
type ModuleId = number;
type ModuleMap = Record<string, ModuleId>;

// Try a few common export shapes, then fall back to default.
const BASE_SOURCES_MAP: ModuleMap =
  ((BASE as any).BASE_SOURCES as ModuleMap) ??
  ((BASE as any).BASE_MAP as ModuleMap) ??
  ((BASE as any).SOURCES as ModuleMap) ??
  ((BASE as any).default as ModuleMap) ??
  {};

const RAW_BASE_LOOKUP_MAP: ModuleMap =
  ((BASE as any).RAW_BASE_LOOKUP as ModuleMap) ??
  ((BASE as any).RAW_LOOKUP as ModuleMap) ??
  {};

/**
 * Normalize any incoming key like "Giraffe_Penguin" or "penguin-giraffe"
 * into our canonical sorted lowercase form: "giraffe_penguin".
 */
export function normalizeHybridKey(input: string): string {
  const parts = input
    .split(/[^a-zA-Z]+/)
    .filter(Boolean)
    .map((s) => s.toLowerCase());
  parts.sort(); // make order-insensitive
  return parts.join("_");
}

/** quick existence check */
export function hasHybrid(key: string): boolean {
  const norm = normalizeHybridKey(key);
  return Boolean(HYBRID_SOURCES[norm]);
}

/** quick existence check for base animals */
export function hasBase(key: string): boolean {
  const norm = key.toLowerCase().replace(/[^a-z]/g, "");
  return Boolean((BASE_SOURCES_MAP as any)[norm]);
}

/** Get a local file URI for a given base animal key (downloads asset if needed). */
export async function getBaseUri(key: string): Promise<string> {
  const norm = key.toLowerCase().replace(/[^a-z]/g, "");

  // Preferred: normalized map
  let mod = (BASE_SOURCES_MAP as any)[norm] as ModuleId | undefined;

  // Fallback: raw lookup in case someone passed a filename-like key
  if (!mod) {
    mod = (RAW_BASE_LOOKUP_MAP as any)[key] as ModuleId | undefined;
  }

  if (!mod) {
    throw new Error(`[assetLoader] No base PNG found for key "${key}"`);
  }

  const asset = Asset.fromModule(mod as number);
  await asset.downloadAsync();
  return asset.localUri ?? asset.uri;
}

/** Load raw XML text for a given base animal (legacy - no longer used for PNG). */
export async function loadBaseXml(key: string): Promise<string> {
  const uri = await getBaseUri(key);
  const res = await fetch(uri);
  if (!res.ok) {
    throw new Error(`[assetLoader] Failed to read base asset at ${uri} (status ${res.status})`);
  }
  return await res.text();
}

/** Get a local file URI for a given hybrid key (downloads asset if needed). */
export async function getHybridUri(key: string): Promise<string> {
  const norm = normalizeHybridKey(key);

  // Preferred: normalized map
  let mod = HYBRID_SOURCES[norm];

  // Fallback: raw lookup in case someone passed an unsorted filename-like key
  if (!mod) {
    mod = RAW_HYBRID_LOOKUP[key as keyof typeof RAW_HYBRID_LOOKUP];
  }

  if (!mod) {
    throw new Error(`[assetLoader] No hybrid PNG found for key "${key}"`);
  }

  const asset = Asset.fromModule(mod);
  await asset.downloadAsync();
  return asset.localUri ?? asset.uri;
}

/** Load raw XML text for a given hybrid key (legacy - no longer used for PNG). */
export async function loadHybridXml(key: string): Promise<string> {
  const uri = await getHybridUri(key);

  // Use fetch() to read the local asset text. This avoids deprecated
  // expo-file-system string APIs and works with file:// / content:// URIs.
  const res = await fetch(uri);
  if (!res.ok) {
    throw new Error(`[assetLoader] Failed to read asset at ${uri} (status ${res.status})`);
  }
  const xml = await res.text();
  return xml;
}

/** Check if a PNG version exists for a given hybrid key (all hybrids are now PNG). */
export function hasHybridPng(key: string): boolean {
  return hasHybrid(key);
}

/** Get a local file URI for a given hybrid PNG key (downloads asset if needed). */
export async function getHybridPngUri(key: string): Promise<string> {
  const norm = normalizeHybridKey(key);

  // All hybrids are now PNG, use HYBRID_SOURCES
  let mod = HYBRID_SOURCES[norm];

  // Fallback: raw lookup in case someone passed an unsorted filename-like key
  if (!mod) {
    mod = RAW_HYBRID_LOOKUP[key as keyof typeof RAW_HYBRID_LOOKUP];
  }

  if (!mod) {
    throw new Error(`[assetLoader] No hybrid PNG found for key "${key}"`);
  }

  const asset = Asset.fromModule(mod);
  await asset.downloadAsync();
  return asset.localUri ?? asset.uri;
}

/** Get the module ID for a given hybrid PNG key (for direct require usage). */
export function getHybridPngModule(key: string): number {
  const norm = normalizeHybridKey(key);

  // All hybrids are now PNG, use HYBRID_SOURCES
  let mod = HYBRID_SOURCES[norm];

  // Fallback: raw lookup
  if (!mod) {
    mod = RAW_HYBRID_LOOKUP[key as keyof typeof RAW_HYBRID_LOOKUP];
  }

  if (!mod) {
    throw new Error(`[assetLoader] No hybrid PNG found for key "${key}"`);
  }

  return mod;
}