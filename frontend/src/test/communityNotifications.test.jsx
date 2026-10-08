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

const mockAlerts = [
  {
    _id: 'alert-1',
    status: 'New',
    priority: 'High',
    message: 'Collar boundary alert',
    createdAt: '2026-10-08T01:00:00Z',
  },
];

const mockSightings = [
  {
    _id: 'sighting-1',
    isCommunityReport: true,
    landmark: 'North Waterhole',
    numberOfElephants: 3,
    directionOfMovement: 'East',
    status: 'New',
    createdAt: '2026-10-08T02:00:00Z',
    message: '3 elephants sighted near North Waterhole (moving East)',
  },
];

const mount = () =>
  render(
    <MemoryRouter initialEntries={['/app']}>
      <AlertNotifications />
      <Routes>
        <Route
          path="/app/alerts/:id"
          element={<p>Alert destination</p>}
        />
        <Route
          path="/app/community/:id"
          element={<p>Community report destination</p>}
        />
        <Route
          path="/app/community"
          element={<p>Community list destination</p>}
        />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.setItem('conservex-token', 'staff-token');
  get.mockImplementation((url) => {
    if (url === '/alerts') return Promise.resolve(mockAlerts);
    if (url === '/community-reports/notifications')
      return Promise.resolve(mockSightings);
    return Promise.resolve([]);
  });
});

afterEach(() => {
  sessionStorage.clear();
  vi.useRealTimers();
});

it('displays elephant sighting notifications alongside collar alerts and combines pending count', async () => {
  mount();
  // 1 alert + 1 sighting = 2 awaiting acknowledgement
  const bell = await screen.findByRole('button', {
    name: 'Alert notifications, 2 awaiting acknowledgement',
  });
  expect(bell).toHaveTextContent('2');

  fireEvent.click(bell);
  const panel = screen.getByRole('region', { name: 'Alert notifications' });

  // Sighting was created after alert, so it appears first
  const items = within(panel).getAllByRole('listitem');
  expect(items).toHaveLength(2);

  // Check sighting item details
  expect(items[0]).toHaveTextContent('Elephant Sighting · North Waterhole');
  expect(items[0]).toHaveTextContent('3 elephants sighted near North Waterhole');
  expect(within(items[0]).getByText('Elephant Sighting')).toBeInTheDocument();
  expect(within(items[0]).getByText('New')).toBeInTheDocument();

  // Check collar alert item
  expect(items[1]).toHaveTextContent('Collar boundary alert');

  // Clicking sighting navigates to community report details
  fireEvent.click(within(panel).getByRole('link', { name: /North Waterhole/ }));
  expect(
    await screen.findByText('Community report destination'),
  ).toBeInTheDocument();
});

it('refreshes automatically when a new-community-report event is received', async () => {
  mount();
  await screen.findByRole('button', {
    name: 'Alert notifications, 2 awaiting acknowledgement',
  });

  // A villager submits a new sighting
  const updatedSightings = [
    ...mockSightings,
    {
      _id: 'sighting-2',
      isCommunityReport: true,
      landmark: 'South Gate Road',
      numberOfElephants: 5,
      status: 'New',
      createdAt: '2026-10-08T03:00:00Z',
      message: '5 elephants sighted near South Gate Road',
    },
  ];

  get.mockImplementation((url) => {
    if (url === '/alerts') return Promise.resolve(mockAlerts);
    if (url === '/community-reports/notifications')
      return Promise.resolve(updatedSightings);
    return Promise.resolve([]);
  });

  // Dispatch the event that villager submission emits
  await act(async () => {
    window.dispatchEvent(new Event('new-community-report'));
  });

  // Pending count should now be 3 (1 collar alert + 2 sightings)
  await waitFor(() => {
    expect(
      screen.getByRole('button', {
        name: 'Alert notifications, 3 awaiting acknowledgement',
      }),
    ).toBeInTheDocument();
  });
});
