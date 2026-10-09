import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfflinePatrol } from '../hooks/useOfflinePatrol';
import { useResource } from '../hooks/useResource';
import { useIncidentOutbox } from '../hooks/useIncidentOutbox';
import { get } from '../services/api';
import {
  cachePatrol,
  cachedPatrol,
  listWaypoints,
} from '../services/offlineWaypoints';
import {
  listOfflineIncidents,
  syncOfflineIncidents,
} from '../services/incidentOutbox';
vi.mock('../services/api', async (original) => ({
  ...(await original()),
  get: vi.fn(),
}));
vi.mock('../services/offlineWaypoints', () => ({
  cachePatrol: vi.fn(),
  cachedPatrol: vi.fn(),
  listWaypoints: vi.fn(),
}));
vi.mock('../services/incidentOutbox', () => ({
  listOfflineIncidents: vi.fn(),
  syncOfflineIncidents: vi.fn(),
  incidentOutboxEvent: 'incident-outbox-changed',
}));
beforeEach(() => {
  vi.resetAllMocks();
  cachePatrol.mockResolvedValue();
  cachedPatrol.mockResolvedValue(null);
  listWaypoints.mockResolvedValue([]);
  listOfflineIncidents.mockResolvedValue([]);
  syncOfflineIncidents.mockResolvedValue({ synced: 0 });
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});
afterEach(() => vi.useRealTimers());
it('loads a patrol, caches it, reloads and incorporates waypoint events', async () => {
  get.mockResolvedValue({ _id: 'p1', status: 'Active' });
  const { result } = renderHook(() => useOfflinePatrol('p1', 'r1'));
  await waitFor(() => expect(result.current.data?.status).toBe('Active'));
  expect(cachePatrol).toHaveBeenCalledWith('r1', {
    _id: 'p1',
    status: 'Active',
  });
  listWaypoints.mockResolvedValue([
    { clientId: 'local', syncStatus: 'PENDING' },
  ]);
  cachedPatrol.mockResolvedValue({ _id: 'p1', status: 'Completed' });
  await act(async () => window.dispatchEvent(new Event('waypoints-changed')));
  expect(result.current.points).toHaveLength(1);
  expect(result.current.data.status).toBe('Completed');
  act(() => result.current.reload());
  await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
});
it.each([undefined, 503, 403])(
  'uses cached patrols only for network/server failures (%s)',
  async (status) => {
    get.mockRejectedValue(
      status
        ? { response: { status, data: { message: 'Access denied' } } }
        : new Error('Offline'),
    );
    // First lookup is the waypoint effect; only the request fallback receives cached data.
    cachedPatrol
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ _id: 'p1', status: 'Active' });
    const { result } = renderHook(() => useOfflinePatrol('p1', 'r1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    if (status === 403) {
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBe('Access denied');
    } else expect(result.current.data._id).toBe('p1');
  },
);
it('shows a recoverable error when neither network nor local cache is available', async () => {
  get.mockRejectedValue(new Error('Offline'));
  cachedPatrol.mockRejectedValue(new Error('Storage unavailable'));
  listWaypoints.mockRejectedValue(new Error('Storage unavailable'));
  const { result } = renderHook(() => useOfflinePatrol('p1', 'r1'));
  await waitFor(() => expect(result.current.error).toContain('Cannot reach'));
  expect(result.current.points).toEqual([]);
});
it('loads resources, reports failures and retries', async () => {
  get
    .mockRejectedValueOnce({ response: { data: { message: 'Try later' } } })
    .mockResolvedValue(['record']);
  const { result } = renderHook(() => useResource('/incidents'));
  await waitFor(() => expect(result.current.error).toBe('Try later'));
  act(() => result.current.reload());
  await waitFor(() => expect(result.current.data).toEqual(['record']));
  expect(result.current.error).toBe('');
});
it('polls resources and stops polling after unmount', async () => {
  vi.useFakeTimers();
  get.mockResolvedValue([]);
  const { unmount } = renderHook(() => useResource('/alerts', true));
  await act(async () => {});
  await act(async () => vi.advanceTimersByTimeAsync(30000));
  expect(get).toHaveBeenCalledTimes(2);
  unmount();
  await act(async () => vi.advanceTimersByTimeAsync(30000));
  expect(get).toHaveBeenCalledTimes(2);
});
it('refreshes the incident queue and synchronizes on reconnection', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  listOfflineIncidents.mockResolvedValue([{ localId: 'one' }]);
  const { result } = renderHook(() => useIncidentOutbox('r1'));
  await waitFor(() => expect(result.current.records).toHaveLength(1));
  await act(async () => result.current.sync());
  expect(syncOfflineIncidents).not.toHaveBeenCalled();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  listOfflineIncidents.mockResolvedValue([]);
  await act(async () => window.dispatchEvent(new Event('online')));
  expect(syncOfflineIncidents).toHaveBeenCalledWith('r1');
  expect(result.current.records).toEqual([]);
  expect(result.current.syncing).toBe(false);
});
it('reports storage errors and clears them after a successful queue refresh', async () => {
  listOfflineIncidents.mockRejectedValue(new Error('Storage failed'));
  const { result } = renderHook(() => useIncidentOutbox(null));
  await waitFor(() =>
    expect(result.current.storageError).toContain('could not be read'),
  );
  listOfflineIncidents.mockResolvedValue([]);
  await act(async () =>
    window.dispatchEvent(new Event('incident-outbox-changed')),
  );
  expect(result.current.storageError).toBe('');
  expect(syncOfflineIncidents).not.toHaveBeenCalled();
});
