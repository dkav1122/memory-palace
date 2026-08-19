import { del, entries, get, set } from "idb-keyval";
import {
	DEFAULT_CHARACTER,
	type CharacterAppearance,
	type CharacterPresetId,
	CHARACTER_PRESETS,
} from "./character";

/**
 * Local-first storage (v1, per PLAN.md):
 * - photo assignments -> IndexedDB (blobs are too big for localStorage)
 * - character appearance -> IndexedDB
 * - run history       -> localStorage
 */

const PHOTO_PREFIX = "photo:";
const CHARACTER_KEY = "mp:character";
const HISTORY_KEY = "mp:history";

export interface StoredAssignment {
  name: string;
  blob: Blob;
}

export async function saveAssignment(
  cardId: string,
  data: StoredAssignment,
): Promise<void> {
  await set(`${PHOTO_PREFIX}${cardId}`, data);
}

export async function deleteAssignment(cardId: string): Promise<void> {
  await del(`${PHOTO_PREFIX}${cardId}`);
}

export async function loadAssignments(): Promise<
  Record<string, StoredAssignment>
> {
  const all = await entries<string, StoredAssignment>();
  const result: Record<string, StoredAssignment> = {};
  for (const [key, value] of all) {
    if (typeof key === "string" && key.startsWith(PHOTO_PREFIX)) {
      result[key.slice(PHOTO_PREFIX.length)] = value;
    }
  }
  return result;
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

export async function loadCharacter(): Promise<CharacterAppearance> {
  try {
    const raw = await get<Partial<CharacterAppearance>>(CHARACTER_KEY);
    if (!raw || typeof raw !== "object") return DEFAULT_CHARACTER;
    const preset =
      raw.preset && raw.preset in CHARACTER_PRESETS
        ? (raw.preset as CharacterPresetId)
        : DEFAULT_CHARACTER.preset;
    const scale =
      typeof raw.scale === "number" && raw.scale >= 0.85 && raw.scale <= 1.15
        ? raw.scale
        : DEFAULT_CHARACTER.scale;
    return {
      preset,
      skin: isHexColor(raw.skin) ? raw.skin : DEFAULT_CHARACTER.skin,
      hair: isHexColor(raw.hair) ? raw.hair : DEFAULT_CHARACTER.hair,
      shirt: isHexColor(raw.shirt) ? raw.shirt : DEFAULT_CHARACTER.shirt,
      pants: isHexColor(raw.pants) ? raw.pants : DEFAULT_CHARACTER.pants,
      scale,
    };
  } catch {
    return DEFAULT_CHARACTER;
  }
}

export async function saveCharacter(
  appearance: CharacterAppearance,
): Promise<void> {
  await set(CHARACTER_KEY, appearance);
}

/**
 * Center-crop to a square and downscale, so billboards render as clean square
 * textures and IndexedDB stays small.
 */
export async function processPhoto(file: Blob, size = 512): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const cropSize = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    bitmap,
    (bitmap.width - cropSize) / 2,
    (bitmap.height - cropSize) / 2,
    cropSize,
    cropSize,
    0,
    0,
    size,
    size,
  );
  bitmap.close();
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Failed to encode image")),
      "image/jpeg",
      0.85,
    );
  });
}

export interface RunRecord {
  ts: number;
  deckSize: number;
  mode: "easy" | "hard";
  correct: number;
  total: number;
  timeMs: number;
}

export const EMPTY_HISTORY: RunRecord[] = [];

// Cached so loadHistory returns a stable reference (usable as a
// useSyncExternalStore snapshot).
let historyCache: RunRecord[] | null = null;

export function loadHistory(): RunRecord[] {
  if (typeof window === "undefined") return EMPTY_HISTORY;
  if (historyCache) return historyCache;
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    historyCache = raw ? (JSON.parse(raw) as RunRecord[]) : EMPTY_HISTORY;
  } catch {
    historyCache = EMPTY_HISTORY;
  }
  return historyCache;
}

export function saveRun(run: RunRecord): void {
  const history = [run, ...loadHistory()].slice(0, 100);
  historyCache = history;
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}
