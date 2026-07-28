/**
 * Minimal promise wrapper over IndexedDB, holding one record per save slot.
 *
 * Save payloads outgrew localStorage: a fresh career serializes to ~4 MB and
 * crosses the ~5 MB per-origin cap during its third season. IndexedDB has no
 * comparable limit, and unlike localStorage it reports failures instead of
 * throwing a QuotaExceededError that is easy to swallow.
 */

const DB_NAME = 'fmlite';
const DB_VERSION = 1;
const STORE = 'saves';

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    // A blocked or unavailable IndexedDB (private browsing in some engines)
    // resolves null so callers can fall back rather than hard-failing.
    req.onerror = () => resolve(null);
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return openDB().then(
    (db) =>
      new Promise<T | null>((resolve, reject) => {
        if (!db) {
          resolve(null);
          return;
        }
        const store = db.transaction(STORE, mode).objectStore(STORE);
        const req = run(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
      }),
  );
}

export function idbGet(key: string): Promise<string | null> {
  return tx<string>('readonly', (s) => s.get(key) as IDBRequest<string>);
}

export function idbPut(key: string, value: string): Promise<unknown> {
  return tx('readwrite', (s) => s.put(value, key) as IDBRequest<unknown>);
}

export function idbDelete(key: string): Promise<unknown> {
  return tx('readwrite', (s) => s.delete(key) as IDBRequest<undefined>);
}

export function idbAvailable(): Promise<boolean> {
  return openDB().then((db) => db !== null);
}
