import type { DraftKind } from "@/lib/content-drafts";

const DB_NAME = "n2-drafts";
const STORE_NAME = "pending";

export type BufferedDraft = { key: string; kind: DraftKind; draftId: string | null; payload: unknown; updatedAt: number };

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: "key" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

export async function bufferDraft(value: BufferedDraft) {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value);
    tx.oncomplete = () => resolve(); tx.onerror = () => resolve();
  });
  db.close();
}

export async function readBufferedDraft(key: string): Promise<BufferedDraft | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).get(key);
    request.onsuccess = () => { resolve(request.result ?? null); db.close(); };
    request.onerror = () => { resolve(null); db.close(); };
  });
}

export async function clearBufferedDraft(key: string) {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve(); tx.onerror = () => resolve();
  });
  db.close();
}

export async function listBufferedDrafts(kind: DraftKind): Promise<BufferedDraft[]> {
  const db = await openDb();
  if (!db) return [];
  return new Promise(resolve => {
    const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).getAll();
    request.onsuccess = () => { resolve((request.result ?? []).filter(item => item.kind === kind)); db.close(); };
    request.onerror = () => { resolve([]); db.close(); };
  });
}
