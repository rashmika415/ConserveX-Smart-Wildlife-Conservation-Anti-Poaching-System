import { api, multipart } from './api';

const DB_NAME = 'conservex-field-data';
const STORE = 'incident-outbox';
const EVENT = 'incident-outbox-changed';

function database() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB)
      return reject(new Error('Offline storage is unavailable'));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE))
        request.result.createObjectStore(STORE, { keyPath: 'localId' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transaction(mode, operation) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const request = operation(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

const changed = () => window.dispatchEvent(new Event(EVENT));

export async function saveOfflineIncident(values, userId) {
  const record = {
    ...values,
    localId: crypto.randomUUID(),
    userId,
    createdAt: new Date().toISOString(),
    syncState: 'SAVED_OFFLINE',
    syncError: '',
  };
  await transaction('readwrite', (store) => store.put(record));
  changed();
  return record;
}

export async function listOfflineIncidents(userId) {
  if (!userId) return [];
  const records = await transaction('readonly', (store) => store.getAll());
  return records
    .filter((record) => record.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function update(record) {
  await transaction('readwrite', (store) => store.put(record));
  changed();
}

async function remove(localId) {
  await transaction('readwrite', (store) => store.delete(localId));
  changed();
}

let activeSync = null;

async function runSync(userId) {
  if (!navigator.onLine) return { synced: 0 };
  const records = await listOfflineIncidents(userId);
  let synced = 0;
  for (const record of records) {
    const pending = { ...record, syncState: 'PENDING_SYNC', syncError: '' };
    await update(pending);
    try {
      const { data } = await api.post(
        '/incidents',
        multipart({
          incidentType: record.incidentType,
          latitude: record.latitude,
          longitude: record.longitude,
          description: record.description,
          photo: record.photo,
          patrolId: record.patrolId,
          clientReportId: record.localId,
        }),
      );
      await remove(record.localId);
      synced += 1;
      window.dispatchEvent(
        new CustomEvent('incident-synced', { detail: data.data }),
      );
    } catch (error) {
      await update({
        ...pending,
        syncError:
          error.response?.data?.message || 'Waiting for a working connection.',
      });
      if (!error.response || error.response.status >= 500) break;
    }
  }
  return { synced };
}

export function syncOfflineIncidents(userId) {
  if (activeSync) return activeSync;
  activeSync = runSync(userId).finally(() => {
    activeSync = null;
  });
  return activeSync;
}

export const incidentOutboxEvent = EVENT;
