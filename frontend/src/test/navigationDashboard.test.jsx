import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  act,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';
import { AppLayout, PublicLayout } from '../layouts/AppLayout';
import Dashboard from '../pages/shared/Dashboard';
import Profile from '../pages/shared/Profile';
import NotFound from '../pages/shared/NotFound';
import { get } from '../services/api';
const state = vi.hoisted(() => ({ user: {}, loading: false, logout: vi.fn() }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => state }));
vi.mock('../services/api', async (original) => ({
  ...(await original()),
  get: vi.fn(),
}));
vi.mock('../hooks/useIncidentOutbox', () => ({
  useIncidentOutbox: () => ({ records: [] }),
}));
const mount = (element, path = '/app') =>
  render(<MemoryRouter initialEntries={[path]}>{element}</MemoryRouter>);
const data = {
  '/alerts': [
    {
      _id: 'a1',
      status: 'New',
      escalatedAt: '2026-10-01',
      animalId: { tagName: 'Elephant E042' },
      zoneId: { zoneName: 'North border' },
    },
    { _id: 'a2', status: 'Resolved', message: 'Old alert' },
  ],
  '/incidents': [
    {
      _id: 'i1',
      status: 'Reported',
      incidentType: 'Snare / Trap',
      rangerId: { name: 'Kasun' },
    },
    { _id: 'i2', status: 'Resolved', incidentType: 'Other' },
  ],
  '/patrols': [
    { _id: 'p1', status: 'Assigned', routeName: 'Next route' },
    {
      _id: 'p2',
      status: 'Active',
      routeName: 'Current route',
      rangerId: { name: 'Kasun' },
      checkpoints: [{}],
      waypoints: [{}],
    },
  ],
  '/community-reports': [
    {
      _id: 'c1',
      status: 'New',
      landmark: 'Waterhole',
      numberOfElephants: 2,
      directionOfMovement: 'East',
      responses: [],
    },
    {
      _id: 'c2',
      status: 'Responding',
      landmark: 'River',
      numberOfElephants: 1,
      responses: [
        { _id: 'r1', action: 'Monitor Situation', respondedAt: '2026-10-01' },
        { _id: 'r2', action: 'Deploy team', respondedAt: '2026-10-02' },
      ],
    },
    {
      _id: 'c3',
      status: 'False Report',
      landmark: 'Gate',
      numberOfElephants: 1,
      responses: [],
    },
  ],
};
beforeEach(() => {
  vi.clearAllMocks();
  state.user = {
    _id: 'u1',
    name: 'Kasun Silva',
    email: 'kasun@example.test',
    role: 'MANAGER',
  };
  state.loading = false;
  get.mockImplementation(async (path) => data[path] || []);
});
afterEach(() => vi.useRealTimers());
it.each(['MANAGER', 'RANGER', 'LIAISON'])(
  'shows %s navigation and operates the mobile menu and logout',
  async (role) => {
    state.user.role = role;
    mount(<AppLayout />);
    const menu = screen.getByRole('button', { name: 'Open menu' });
    fireEvent.click(menu);
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Close navigation' }));
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(menu);
    fireEvent.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(menu);
    fireEvent.click(
      within(
        screen.getByRole('navigation', { name: 'Main navigation' }),
      ).getByRole('link', { name: 'Profile' }),
    );
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(
      Boolean(screen.queryByRole('link', { name: 'Animal Tracking' })),
    ).toBe(role === 'MANAGER');
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(state.logout).toHaveBeenCalledOnce();
    await act(async () => {});
  },
);
it('provides public navigation and profile details', () => {
  const { unmount } = mount(<PublicLayout />, '/');
  expect(
    screen.getByRole('link', { name: 'Report a sighting' }),
  ).toHaveAttribute('href', '/report');
  expect(screen.getByRole('link', { name: 'Staff login' })).toHaveAttribute(
    'href',
    '/login',
  );
  unmount();
  mount(<Profile />);
  expect(screen.getByText('kasun@example.test')).toBeInTheDocument();
  expect(screen.getByText('Park Manager')).toBeInTheDocument();
});
it('shows a way back from an unknown route', () => {
  mount(<NotFound />);
  expect(screen.getByRole('link')).toHaveAttribute('href', '/');
});
it.each(['MANAGER', 'RANGER', 'LIAISON'])(
  'calculates %s dashboard counts and shows saved activity',
  async (role) => {
    state.user.role = role;
    mount(<Dashboard />);
    expect(
      await screen.findByText('Waterhole (2 elephants)'),
    ).toBeInTheDocument();
    expect(screen.getByText('Elephant E042')).toBeInTheDocument();
    expect(screen.getByText('Escalated')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /High-risk alerts/ }),
    ).toHaveTextContent('1');
    if (role === 'RANGER')
      expect(
        screen.getByRole('link', { name: 'Continue patrol' }),
      ).toHaveAttribute('href', '/app/patrols/p2');
    if (role === 'LIAISON') {
      expect(get).not.toHaveBeenCalledWith('/patrols');
      expect(screen.getByText('Monitor Situation')).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /Awaiting response/ }),
      ).toHaveTextContent('1');
    } else expect(screen.getByText('Snare / Trap')).toBeInTheDocument();
  },
);
it('shows the next assignment when there is no active patrol', async () => {
  state.user.role = 'RANGER';
  get.mockImplementation(async (path) =>
    path === '/patrols' ? [data[path][0]] : data[path] || [],
  );
  mount(<Dashboard />);
  expect(
    await screen.findByRole('link', { name: 'View & start patrol' }),
  ).toHaveAttribute('href', '/app/patrols/p1');
});
it('recovers the dashboard after an API failure and tolerates unavailable community reports', async () => {
  get.mockRejectedValueOnce({
    response: { data: { message: 'Service unavailable' } },
  });
  mount(<Dashboard />);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Service unavailable',
  );
  get.mockImplementation(async (path) => {
    if (path === '/community-reports') throw new Error('Offline');
    return data[path] || [];
  });
  fireEvent.click(screen.getByRole('button', { name: 'Retry dashboard' }));
  await screen.findByText('Elephant E042');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it('refreshes dashboard figures on the interval and cancels it on unmount', async () => {
  vi.useFakeTimers();
  const { unmount } = mount(<Dashboard />);
  await act(async () => {});
  expect(get).toHaveBeenCalledTimes(4);
  await act(async () => vi.advanceTimersByTimeAsync(30000));
  expect(get).toHaveBeenCalledTimes(8);
  unmount();
  await act(async () => vi.advanceTimersByTimeAsync(30000));
  expect(get).toHaveBeenCalledTimes(8);
});
it('renders the application router and blocks protected content while authenticating', async () => {
  state.loading = true;
  const { unmount } = mount(<App />, '/app/profile');
  expect(screen.getByRole('status')).toHaveTextContent('Loading');
  expect(screen.queryByText('kasun@example.test')).not.toBeInTheDocument();
  unmount();
  state.loading = false;
  state.user.role = 'RANGER';
  mount(<App />, '/app/profile');
  expect(screen.getByText('kasun@example.test')).toBeInTheDocument();
  await act(async () => {});
});
