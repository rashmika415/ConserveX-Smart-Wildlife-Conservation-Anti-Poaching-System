import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { api, get, errorMessage, multipart, photoUrl } from '../services/api';
import { reverseGeocodeGeoapify } from '../services/geocode';
const defaultBase = api.defaults.baseURL;
beforeEach(() => sessionStorage.clear());
afterEach(() => {
  sessionStorage.clear();
  api.defaults.baseURL = defaultBase;
});
it('adds the active session token to requests and unwraps API data', async () => {
  const adapter = vi.fn(async (config) => ({
    data: { data: ['saved'] },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  }));
  const previous = api.defaults.adapter;
  api.defaults.adapter = adapter;
  try {
    expect(await get('/incidents')).toEqual(['saved']);
    expect(adapter.mock.calls[0][0].headers.Authorization).toBeUndefined();
    sessionStorage.setItem('conservex-token', 'token');
    await get('/patrols');
    expect(adapter.mock.calls[1][0].headers.Authorization).toBe('Bearer token');
  } finally {
    api.defaults.adapter = previous;
  }
});
it.each([
  ['/incidents', 401, true],
  ['/auth/login', 401, false],
  ['/incidents', 503, false],
])(
  'handles %s error %s with appropriate session expiry',
  async (url, status, expired) => {
    const listener = vi.fn();
    window.addEventListener('session-expired', listener);
    try {
      await expect(
        api.get(url, {
          adapter: async (config) => {
            throw { config, response: { status } };
          },
        }),
      ).rejects.toMatchObject({ response: { status } });
      expect(listener).toHaveBeenCalledTimes(expired ? 1 : 0);
    } finally {
      window.removeEventListener('session-expired', listener);
    }
  },
);
it('formats transport errors and excludes empty multipart fields while retaining zero', () => {
  expect(errorMessage({ code: 'ECONNABORTED' })).toContain('timed out');
  expect(errorMessage(new Error('Offline'))).toContain('Cannot reach');
  expect(
    errorMessage({ response: { data: { message: 'Invalid report' } } }),
  ).toBe('Invalid report');
  const body = multipart({
    zero: 0,
    empty: '',
    absent: undefined,
    photo: null,
    text: 'report',
  });
  expect([...body.entries()]).toEqual([
    ['zero', '0'],
    ['text', 'report'],
  ]);
  expect(photoUrl(null)).toBe('');
  expect(photoUrl('/uploads/a.png')).toBe('/uploads/a.png');
  api.defaults.baseURL = 'https://api.example.test/api';
  expect(photoUrl('/uploads/a.png')).toBe(
    'https://api.example.test/uploads/a.png',
  );
});
it.each([
  [null, 81],
  [6, null],
  ['bad', 81],
  [6, 'bad'],
])('skips geocoding invalid coordinates %s,%s', async (lat, lon) => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  expect(await reverseGeocodeGeoapify(lat, lon)).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});
it.each([
  [
    {
      city: 'Town',
      county: 'District',
      state: 'Province',
      formatted: 'Full address',
      country: 'Sri Lanka',
    },
    'Town, District',
  ],
  [{ suburb: 'Suburb', state_district: 'District' }, 'Suburb, District'],
  [{ village: 'Village' }, 'Village'],
  [{ county: 'District' }, 'District'],
  [{ town: 'Town' }, 'Town'],
  [{ formatted: 'Address only' }, 'Address only'],
  [{}, ''],
])('normalizes place information from geocoding', async (properties, title) => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ features: [{ properties }] }),
  });
  vi.stubGlobal('fetch', fetch);
  expect(await reverseGeocodeGeoapify('6.45', '81.4')).toMatchObject({
    areaTitle: title,
  });
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining('lat=6.45&lon=81.4'),
  );
});
it.each(['rejected', 'empty', 'network'])(
  'degrades gracefully after %s geocoding response',
  async (mode) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      mode === 'network'
        ? vi.fn().mockRejectedValue(new Error('Offline'))
        : vi.fn().mockResolvedValue({
            ok: mode !== 'rejected',
            json: async () => ({ features: [] }),
          }),
    );
    expect(await reverseGeocodeGeoapify(6, 81)).toBeNull();
  },
);
