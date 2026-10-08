import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AlertNotifications from '../components/AlertNotifications';
import { get } from '../services/api';

vi.mock('../services/api', () => ({
  get: vi.fn(),
  errorMessage: () => 'Unable to load notifications',
  photoUrl: (path) => path,
}));
const records = [
  {
    _id: 'new',
    status: 'New',
    priority: 'High',
    message: 'Recent entry',
    createdAt: '2026-10-08T01:00:00Z',
  },
  {
    _id: 'overdue',
    status: 'New',
    priority: 'Critical',
    message: 'Overdue entry',
    escalatedAt: '2026-10-08T00:20:00Z',
    createdAt: '2026-10-08T00:00:00Z',
  },
  {
    _id: 'ack',
    status: 'Acknowledged',
    priority: 'High',
    message: 'Being handled',
  },
  {
    _id: 'resolved',
    status: 'Resolved',
    priority: 'High',
    message: 'Closed entry',
  },
];
const mount = () =>
  render(
    <MemoryRouter>
      <AlertNotifications />
      <Routes>
        <Route
          path="/app/alerts/:id"
          element={<p>Alert detail destination</p>}
        />
      </Routes>
    </MemoryRouter>,
  );
beforeEach(() => {
  vi.resetAllMocks();
  get.mockResolvedValue(records);
});
afterEach(() => vi.useRealTimers());

it('counts alerts awaiting acknowledgement, prioritizes escalation, and links to details', async () => {
  mount();
  const bell = await screen.findByRole('button', {
    name: 'Alert notifications, 2 awaiting acknowledgement',
  });
  fireEvent.click(bell);
  const panel = screen.getByRole('region', { name: 'Alert notifications' });
  expect(within(panel).getAllByRole('listitem')[0]).toHaveTextContent(
    'Overdue entry',
  );
  expect(within(panel).getByText('Escalated')).toBeInTheDocument();
  expect(within(panel).getByText('Being handled')).toBeInTheDocument();
  expect(screen.queryByText('Closed entry')).not.toBeInTheDocument();
  fireEvent.click(within(panel).getByRole('link', { name: /Overdue entry/ }));
  expect(
    await screen.findByText('Alert detail destination'),
  ).toBeInTheDocument();
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
});

it('closes on Escape with restored focus and on outside click', async () => {
  mount();
  const bell = await screen.findByRole('button', { name: /2 awaiting/ });
  fireEvent.click(bell);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(bell).toHaveFocus();
  expect(bell).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(bell);
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
});

it('shows loading, empty state, and retry after a failed request', async () => {
  get
    .mockReturnValueOnce(new Promise(() => {}))
    .mockRejectedValueOnce(new Error('offline'));
  mount();
  fireEvent.click(screen.getByRole('button', { name: /Alert notifications/ }));
  expect(screen.getByText('Loading alerts…')).toBeInTheDocument();
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Unable to load notifications',
  );
  get.mockResolvedValue([]);
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('No open alerts.')).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: /0 awaiting/ }),
  ).toBeInTheDocument();
});

it('refreshes every 30 seconds and on window focus, and cleans up on unmount', async () => {
  vi.useFakeTimers();
  const view = mount();
  await act(async () => {});
  expect(
    screen.getByRole('button', { name: /2 awaiting/ }),
  ).toBeInTheDocument();
  get.mockResolvedValue([]);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(30000);
  });
  expect(
    screen.getByRole('button', { name: /0 awaiting/ }),
  ).toBeInTheDocument();
  get.mockResolvedValue(records);
  await act(async () => {
    window.dispatchEvent(new Event('focus'));
  });
  expect(
    screen.getByRole('button', { name: /2 awaiting/ }),
  ).toBeInTheDocument();
  view.unmount();
  const calls = get.mock.calls.length;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(30000);
    window.dispatchEvent(new Event('focus'));
  });
  expect(get).toHaveBeenCalledTimes(calls);
});

it('caps the dropdown at five alerts with a link to the complete list', async () => {
  get.mockResolvedValue(
    Array.from({ length: 105 }, (_, i) => ({ ...records[0], _id: String(i) })),
  );
  mount();
  const bell = await screen.findByRole('button', { name: /105 awaiting/ });
  expect(bell).toHaveTextContent('99+');
  fireEvent.click(bell);
  await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(5));
  expect(screen.getByRole('link', { name: 'View all alerts' })).toHaveAttribute(
    'href',
    '/app/alerts',
  );
});
