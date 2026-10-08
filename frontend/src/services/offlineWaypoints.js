import { api, multipart, errorMessage } from './api';

const changed = () => window.dispatchEvent(new Event('waypoints-changed'));
function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('conservex-offline', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('waypoints', { keyPath: 'clientId' });
      request.result.createObjectStore('patrols', { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function transaction(store, mode, operation) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const request = operation(tx.objectStore(store));
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () => reject(tx.error || new Error('Local storage failed'));
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
export async function listWaypoints(userId, patrolId) {
  const records = await transaction('waypoints', 'readonly', (store) =>
    store.getAll(),
  );
  return records
    .filter(
      (point) =>
        point.userId === userId && (!patrolId || point.patrolId === patrolId),
    )
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
}
export async function saveWaypoint(userId, patrolId, values) {
  for (const [field, min, max] of [
    ['latitude', -90, 90],
    ['longitude', -180, 180],
  ]) {
    if (
      String(values[field]).trim() === '' ||
      !Number.isFinite(Number(values[field])) ||
      Number(values[field]) < min ||
      Number(values[field]) > max
    )
      throw new Error(`${field} must be between ${min} and ${max}`);
  }
  const point = {
    ...values,
    clientId: crypto.randomUUID(),
    userId,
    patrolId,
    recordedAt: new Date().toISOString(),
    syncStatus: 'PENDING',
  };
  await transaction('waypoints', 'readwrite', (store) => store.put(point));
  changed();
  return point;
}
export function cachePatrol(userId, patrol) {
  return transaction('patrols', 'readwrite', (store) =>
    store.put({ key: `${userId}:${patrol._id}`, patrol }),
  );
}
export async function cachedPatrol(userId, patrolId) {
  return (
    await transaction('patrols', 'readonly', (store) =>
      store.get(`${userId}:${patrolId}`),
    )
  )?.patrol;
}
const syncing = new Map();
export function syncWaypoints(userId) {
  if (syncing.has(userId)) return syncing.get(userId);
  const run = async () => {
    if (navigator.onLine === false) return;
    for (const point of await listWaypoints(userId)) {
      if (point.syncStatus === 'SYNCED') continue;
      if (
        navigator.onLine === false ||
        !sessionStorage.getItem('conservex-token')
      )
        break;
      try {
        const { data } = await api.post(
          `/patrols/${point.patrolId}/waypoints`,
          multipart({
            latitude: point.latitude,
            longitude: point.longitude,
            type: point.type,
            description: point.description,
            photo: point.photo,
            clientId: point.clientId,
            recordedAt: point.recordedAt,
          }),
        );
        await cachePatrol(userId, data.data);
        await transaction('waypoints', 'readwrite', (store) =>
          store.put({
            ...point,
            photo: null,
            syncStatus: 'SYNCED',
            syncError: '',
          }),
        );
        changed();
      } catch (error) {
        await transaction('waypoints', 'readwrite', (store) =>
          store.put({ ...point, syncError: errorMessage(error) }),
        );
        changed();
        // Keep every failed record for a later retry, including server rejections.
        if (
          !error.response ||
          error.response.status === 401 ||
          error.response.status >= 500
        )
          break;
      }
    }
  };
  const promise = run().finally(() => syncing.delete(userId));
  syncing.set(userId, promise);
  return promise;
}
