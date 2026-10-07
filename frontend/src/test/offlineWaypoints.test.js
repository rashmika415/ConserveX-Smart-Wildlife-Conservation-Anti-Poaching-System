import { Blob as NativeBlob } from 'node:buffer';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { api, multipart } from '../services/api';
import {
  saveWaypoint,
  listWaypoints,
  syncWaypoints,
  cachedPatrol,
} from '../services/offlineWaypoints';
vi.mock('../services/api', async (original) => {
  const actual = await original();
  return {
    ...actual,
    multipart: vi.fn(actual.multipart),
    api: { post: vi.fn() },
  };
});
const values = {
  latitude: '6.45',
  longitude: '81.4',
  type: 'Checkpoint',
  description: 'East gate',
  photo: null,
};
beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  sessionStorage.setItem('conservex-token', 'test-token');
  vi.clearAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});
describe('durable offline waypoints', () => {
  it('saves offline before any request and isolates ranger queues', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const point = await saveWaypoint('ranger', 'patrol', values);
    await syncWaypoints('ranger');
    expect(api.post).not.toHaveBeenCalled();
    expect(await listWaypoints('ranger', 'patrol')).toEqual([point]);
    expect(await listWaypoints('other')).toEqual([]);
    expect(point.syncStatus).toBe('PENDING');
  });
  it('keeps failed requests pending and retries with the original ID and capture time', async () => {
    const point = await saveWaypoint('ranger', 'patrol', values);
    api.post.mockRejectedValueOnce(new Error('network down'));
    await syncWaypoints('ranger');
    expect((await listWaypoints('ranger'))[0].syncStatus).toBe('PENDING');
    api.post.mockResolvedValueOnce({
      data: {
        data: { _id: 'patrol', waypoints: [{ clientId: point.clientId }] },
      },
    });
    await syncWaypoints('ranger');
    expect((await listWaypoints('ranger'))[0].syncStatus).toBe('SYNCED');
    for (const [, body] of api.post.mock.calls) {
      expect(body.get('clientId')).toBe(point.clientId);
      expect(body.get('recordedAt')).toBe(point.recordedAt);
    }
    expect((await cachedPatrol('ranger', 'patrol')).waypoints).toHaveLength(1);
    await syncWaypoints('ranger');
    expect(api.post).toHaveBeenCalledTimes(2);
  });
  it('persists a photo alongside the waypoint until upload succeeds', async () => {
    // fake-indexeddb uses Node structuredClone, which needs a native Blob.
    const photo = new NativeBlob(['photo-data'], { type: 'image/png' });
    await saveWaypoint('ranger', 'patrol', { ...values, photo });
    expect(await (await listWaypoints('ranger'))[0].photo.text()).toBe(
      'photo-data',
    );
    api.post.mockResolvedValue({
      data: { data: { _id: 'patrol', waypoints: [] } },
    });
    await syncWaypoints('ranger');
    expect(await multipart.mock.calls[0][0].photo.text()).toBe('photo-data');
    expect(multipart.mock.calls[0][0].photo.type).toBe('image/png');
    expect((await listWaypoints('ranger'))[0].photo).toBeNull();
  });
  it('serializes simultaneous retries and retains server rejections', async () => {
    await saveWaypoint('ranger', 'patrol', values);
    api.post.mockRejectedValue({
      response: { status: 409, data: { message: 'Patrol ended' } },
    });
    await Promise.all([syncWaypoints('ranger'), syncWaypoints('ranger')]);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect((await listWaypoints('ranger'))[0]).toMatchObject({
      syncStatus: 'PENDING',
      syncError: 'Patrol ended',
    });
  });
  it('never sends a waypoint if local storage fails', async () => {
    vi.stubGlobal('indexedDB', {
      open: () => {
        throw new Error('Storage unavailable');
      },
    });
    await expect(saveWaypoint('ranger', 'patrol', values)).rejects.toThrow(
      'Storage unavailable',
    );
    expect(api.post).not.toHaveBeenCalled();
  });
});
