import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { api, get } from '../services/api';
import { syncWaypoints } from '../services/offlineWaypoints';

vi.mock('../services/api', () => ({ api: { post: vi.fn() }, get: vi.fn() }));
vi.mock('../services/offlineWaypoints', () => ({ syncWaypoints: vi.fn() }));
const user = { _id: 'r1', name: 'Field Ranger', role: 'RANGER' };
const mount = () => renderHook(() => useAuth(), { wrapper: AuthProvider });
beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  syncWaypoints.mockResolvedValue();
});
afterEach(() => {
  sessionStorage.clear();
  vi.useRealTimers();
});

it('logs in, persists the session, synchronizes ranger data, and logs out', async () => {
  api.post.mockResolvedValue({ data: { data: { user, token: 'token' } } });
  const { result } = mount();
  expect(result.current.loading).toBe(false);
  await act(async () => {
    expect(
      await result.current.login('ranger@example.test', 'password'),
    ).toEqual(user);
  });
  expect(api.post).toHaveBeenCalledWith('/auth/login', {
    email: 'ranger@example.test',
    password: 'password',
  });
  expect(sessionStorage.getItem('conservex-token')).toBe('token');
  expect(JSON.parse(sessionStorage.getItem('conservex-user'))).toEqual(user);
  expect(syncWaypoints).toHaveBeenCalledWith('r1');
  act(() => result.current.logout());
  expect(result.current.user).toBeNull();
  expect(sessionStorage.getItem('conservex-token')).toBeNull();
});

it('restores a session and clears it on the expiration event', async () => {
  sessionStorage.setItem('conservex-token', 'token');
  get.mockResolvedValue({ ...user, role: 'MANAGER' });
  const { result } = mount();
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(get).toHaveBeenCalledWith('/auth/me');
  expect(result.current.user.role).toBe('MANAGER');
  expect(syncWaypoints).not.toHaveBeenCalled();
  act(() => window.dispatchEvent(new Event('session-expired')));
  expect(result.current.user).toBeNull();
});

it.each([
  ['offline with cache', new Error('Offline'), JSON.stringify(user), user],
  ['offline with damaged cache', new Error('Offline'), '{', null],
  [
    'rejected session',
    { response: { status: 401 } },
    JSON.stringify(user),
    null,
  ],
])(
  'handles %s during restoration',
  async (_name, failure, cached, expected) => {
    sessionStorage.setItem('conservex-token', 'token');
    sessionStorage.setItem('conservex-user', cached);
    get.mockRejectedValue(failure);
    const { result } = mount();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(expected);
    if (!expected) expect(sessionStorage.getItem('conservex-token')).toBeNull();
  },
);

it('does not create a session after rejected login', async () => {
  api.post.mockRejectedValue(new Error('Invalid credentials'));
  const { result } = mount();
  await act(async () => {
    await expect(result.current.login('bad', 'bad')).rejects.toThrow(
      'Invalid credentials',
    );
  });
  expect(result.current.user).toBeNull();
  expect(sessionStorage.length).toBe(0);
});

it('retries ranger synchronization on connectivity and timer, and cleans up on unmount', async () => {
  vi.useFakeTimers();
  api.post.mockResolvedValue({ data: { data: { user, token: 'token' } } });
  syncWaypoints.mockRejectedValue(new Error('Offline'));
  const { result, unmount } = mount();
  await act(async () => {
    await result.current.login('ranger', 'password');
  });
  await act(async () => window.dispatchEvent(new Event('online')));
  await act(async () => vi.advanceTimersByTimeAsync(30000));
  expect(syncWaypoints).toHaveBeenCalledTimes(3);
  unmount();
  await act(async () => {
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(30000);
  });
  expect(syncWaypoints).toHaveBeenCalledTimes(3);
});

it.each([true, false])(
  'ignores a late session response after unmount (success=%s)',
  async (success) => {
    sessionStorage.setItem('conservex-token', 'token');
    let resolve, reject;
    get.mockReturnValue(
      new Promise((yes, no) => {
        resolve = yes;
        reject = no;
      }),
    );
    const { unmount } = mount();
    unmount();
    await act(async () => {
      if (success) resolve(user);
      else reject(new Error('Offline'));
    });
    expect(sessionStorage.getItem('conservex-user')).toBeNull();
  },
);
