/**
 * @typedef {Object} Snapshot
 * @property {number} id  Auto-increment IndexedDB key.
 * @property {string} tabId
 * @property {string} name
 * @property {string} content  Plain text, or a base64url deflate token when `compressed`.
 * @property {boolean} [compressed]
 * @property {number} timestamp
 */

import { compressText, decompressText } from '../util/compress.js';

const DB_NAME = 'math-notes';
const STORE = 'snapshots';
const SNAPSHOT_LIMIT = 10;

let dbPromise = null;

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('tabId', 'tabId');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function sortNewest(snapshots) {
  return [...snapshots].sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Save a snapshot of a tab, then trim that tab's history to SNAPSHOT_LIMIT.
 * @param {{ id: string, name: string, content: string }} tab
 * @returns {Promise<void>}
 */
async function saveSnapshot(tab) {
  const db = await openDb();
  // Store the sheet deflated when the platform supports it; fall back to plain
  // text so a snapshot is never lost to a missing API.
  const compressed = await compressText(tab.content);
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add({
      tabId: tab.id,
      name: tab.name,
      content: compressed === null ? tab.content : compressed,
      compressed: compressed !== null,
      timestamp: Date.now(),
    });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  await trimTab(tab.id);
}

// Inflate a compressed snapshot's content before it is used. A failed inflate
// restores the tab empty rather than failing the whole recovery.
async function hydrate(snapshot) {
  if (!snapshot || !snapshot.compressed) return snapshot;
  const content = await decompressText(snapshot.content);
  return { ...snapshot, content: content === null ? '' : content };
}

// Keep at most SNAPSHOT_LIMIT snapshots per tab, dropping the oldest.
function trimTab(tabId) {
  return openDb().then((db) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const request = store.index('tabId').getAll(tabId);
    request.onsuccess = () => {
      const all = request.result;
      if (all.length > SNAPSHOT_LIMIT) {
        for (const snapshot of sortNewest(all).slice(SNAPSHOT_LIMIT)) {
          store.delete(snapshot.id);
        }
      }
    };
    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  });
}

async function listSnapshots() {
  const db = await openDb();
  const all = await requestToPromise(db.transaction(STORE).objectStore(STORE).getAll());
  return Promise.all(sortNewest(all).map(hydrate));
}

// The most recent snapshot of each tab, newest first.
/**
 * @returns {Promise<Snapshot[]>}
 */
async function latestPerTab() {
  const byTab = new Map();
  for (const snapshot of await listSnapshots()) {
    const existing = byTab.get(snapshot.tabId);
    if (!existing || snapshot.timestamp > existing.timestamp) byTab.set(snapshot.tabId, snapshot);
  }
  return [...byTab.values()].sort((a, b) => b.timestamp - a.timestamp);
}

async function clearSnapshots() {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export { saveSnapshot, listSnapshots, latestPerTab, clearSnapshots, SNAPSHOT_LIMIT };
