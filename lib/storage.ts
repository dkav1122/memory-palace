import { del, entries, set } from "idb-keyval";

/**
 * Local-first storage (v1, per PLAN.md):
 * - photo assignments -> IndexedDB (blobs are too big for localStorage)
 * - run history       -> localStorage
 */

const PHOTO_PREFIX = "photo:";
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

const HISTORY_CHANGED_EVENT = "mp:history-changed";

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

/** Subscribe to history changes for useSyncExternalStore (same-tab + cross-tab + bfcache). */
export function subscribeHistory(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const invalidate = () => {
    historyCache = null;
    onStoreChange();
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key === HISTORY_KEY || event.key === null) invalidate();
  };
  const onCustom = () => onStoreChange();
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) invalidate();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(HISTORY_CHANGED_EVENT, onCustom);
  window.addEventListener("pageshow", onPageShow);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(HISTORY_CHANGED_EVENT, onCustom);
    window.removeEventListener("pageshow", onPageShow);
  };
}

export function saveRun(run: RunRecord): void {
  const previous = loadHistory();
  const history = [run, ...previous].slice(0, 100);
  historyCache = history;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    window.dispatchEvent(new Event(HISTORY_CHANGED_EVENT));
  } catch {
    // Keep cache coherent with durable storage when setItem fails
    // (e.g. Safari private mode quota / disabled storage).
    historyCache = previous.length === 0 ? EMPTY_HISTORY : previous;
  }
}
