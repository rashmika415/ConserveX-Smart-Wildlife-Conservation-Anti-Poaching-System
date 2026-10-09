import { beforeEach, it, expect, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { api } from '../services/api';
import {
  saveOfflineIncident,
  listOfflineIncidents,
  syncOfflineIncidents,
} from '../services/incidentOutbox';
vi.mock('../services/api', async (original) => ({
  ...(await original()),
  api: { post: vi.fn() },
}));
const values = {
  incidentType: 'Snare / Trap',
  latitude: '6.45',
  longitude: '81.4',
  description: 'Wire trap',
  photo: null,
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});
it('persists incidents per ranger, orders newest first, and makes no request offline', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  const first = await saveOfflineIncident(values, 'r1');
  const second = await saveOfflineIncident(
    { ...values, description: 'Second report' },
    'r1',
  );
  await saveOfflineIncident(values, 'r2');
  const records = await listOfflineIncidents('r1');
  expect(records).toHaveLength(2);
  expect(records.map((r) => r.localId)).toEqual(
    expect.arrayContaining([first.localId, second.localId]),
  );
  expect(new Date(records[0].createdAt).getTime()).toBeGreaterThanOrEqual(
    new Date(records[1].createdAt).getTime(),
  );
  expect(await listOfflineIncidents(null)).toEqual([]);
  expect(await syncOfflineIncidents('r1')).toEqual({ synced: 0 });
  expect(api.post).not.toHaveBeenCalled();
});
it('retains failed reports and retries with the same client identifier before removing them', async () => {
  const record = await saveOfflineIncident(values, 'r1');
  api.post.mockRejectedValueOnce(new Error('Offline'));
  await syncOfflineIncidents('r1');
  expect((await listOfflineIncidents('r1'))[0]).toMatchObject({
    syncState: 'PENDING_SYNC',
    syncError: 'Waiting for a working connection.',
  });
  const onSynced = vi.fn();
  window.addEventListener('incident-synced', onSynced);
  try {
    api.post.mockResolvedValue({ data: { data: { _id: 'server-id' } } });
    await expect(syncOfflineIncidents('r1')).resolves.toEqual({ synced: 1 });
    expect(await listOfflineIncidents('r1')).toEqual([]);
    expect(onSynced.mock.calls[0][0].detail).toEqual({ _id: 'server-id' });
    for (const [url, body] of api.post.mock.calls) {
      expect(url).toBe('/incidents');
      expect(body.get('clientReportId')).toBe(record.localId);
      expect(body.get('description')).toBe(values.description);
    }
  } finally {
    window.removeEventListener('incident-synced', onSynced);
  }
});
it.each([400, 503])(
  'retains server rejection %s and stops only for server outages',
  async (status) => {
    await saveOfflineIncident(values, 'r1');
    await saveOfflineIncident(values, 'r1');
    api.post.mockRejectedValue({
      response: { status, data: { message: 'Rejected report' } },
    });
    await Promise.all([syncOfflineIncidents('r1'), syncOfflineIncidents('r1')]);
    expect(api.post).toHaveBeenCalledTimes(status === 503 ? 1 : 2);
    const records = await listOfflineIncidents('r1');
    expect(records).toHaveLength(2);
    expect(records.some((r) => r.syncError === 'Rejected report')).toBe(true);
  },
);
it('reports unavailable browser storage instead of claiming a local save', async () => {
  vi.stubGlobal('indexedDB', undefined);
  await expect(saveOfflineIncident(values, 'r1')).rejects.toThrow(
    'Offline storage is unavailable',
  );
});
