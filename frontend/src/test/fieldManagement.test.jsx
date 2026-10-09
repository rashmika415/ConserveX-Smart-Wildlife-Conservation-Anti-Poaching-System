import { beforeEach, it, expect, vi } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  act,
} from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import IncidentManagement, {
  IncidentDetails,
} from '../modules/incidents/IncidentManagement';
import PatrolManagement, {
  CreatePatrol,
} from '../modules/patrols/PatrolManagement';
import ActivePatrol from '../modules/patrols/ActivePatrol';
import { api, get } from '../services/api';
import {
  saveWaypoint,
  syncWaypoints,
  listWaypoints,
} from '../services/offlineWaypoints';
const state = vi.hoisted(() => ({
  user: {},
  outbox: {},
  patrol: {},
  reload: vi.fn(),
}));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: state.user }),
}));
vi.mock('../hooks/useIncidentOutbox', () => ({
  useIncidentOutbox: () => state.outbox,
}));
vi.mock('../hooks/useOfflinePatrol', () => ({
  useOfflinePatrol: () => state.patrol,
}));
vi.mock('../services/offlineWaypoints', () => ({
  saveWaypoint: vi.fn(),
  syncWaypoints: vi.fn(),
  listWaypoints: vi.fn(),
}));
vi.mock('../services/geocode', () => ({
  reverseGeocodeGeoapify: vi.fn().mockResolvedValue(null),
}));
vi.mock('../services/api', async (original) => ({
  ...(await original()),
  get: vi.fn(),
  api: { post: vi.fn(), patch: vi.fn() },
}));
const mount = (element, path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={element} />
        <Route path="/details/:id" element={element} />
        <Route
          path="/app/patrols/:id"
          element={<p>Assigned patrol opened</p>}
        />
      </Routes>
    </MemoryRouter>,
  );
const change = (label, value) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const incident = {
  _id: 'i1',
  incidentType: 'Snare / Trap',
  description: 'Wire near gate',
  status: 'Reported',
  createdAt: '2026-10-01T09:00:00Z',
  rangerId: { name: 'Kasun' },
  location: { latitude: 6.45, longitude: 81.4 },
  syncStatus: 'Synced',
};
beforeEach(() => {
  vi.clearAllMocks();
  state.user = { _id: 'r1', role: 'MANAGER', name: 'Kasun Silva' };
  state.outbox = {
    records: [],
    syncing: false,
    storageError: '',
    sync: vi.fn(),
  };
  state.patrol = {
    data: {
      _id: 'p1',
      routeName: 'East route',
      parkName: 'Yala',
      status: 'Active',
      rangerId: { name: 'Kasun' },
      checkpoints: [
        { name: 'Gate', location: { latitude: 6.45, longitude: 81.4 } },
      ],
      waypoints: [],
    },
    points: [],
    reload: state.reload,
  };
  get.mockResolvedValue([]);
  api.patch.mockResolvedValue({ data: { message: 'Patrol saved' } });
  saveWaypoint.mockResolvedValue();
  syncWaypoints.mockResolvedValue();
  listWaypoints.mockResolvedValue([]);
});

it('lists incidents, filters statuses and reloads after synchronization', async () => {
  get.mockResolvedValue([
    incident,
    {
      ...incident,
      _id: 'i2',
      incidentType: 'Other',
      status: 'Resolved',
      description: '',
    },
  ]);
  mount(<IncidentManagement />);
  expect(await screen.findByText('Wire near gate')).toBeInTheDocument();
  expect(screen.getByText('No description provided')).toBeInTheDocument();
  change(/Filter by status/, 'Resolved');
  expect(screen.queryByText('Wire near gate')).not.toBeInTheDocument();
  change(/Filter by status/, 'Under Review');
  expect(screen.getByText('No incidents match this view.')).toBeInTheDocument();
  await act(async () => window.dispatchEvent(new Event('incident-synced')));
  expect(get).toHaveBeenCalledTimes(2);
});
it('shows unsynchronized ranger reports even when the server fails and allows retry', async () => {
  state.user.role = 'RANGER';
  state.outbox.records = [
    { ...incident, localId: 'local', syncState: 'SAVED_OFFLINE' },
  ];
  get.mockRejectedValue(new Error('Offline'));
  mount(<IncidentManagement />);
  expect(screen.getByRole('link', { name: /saved locally/ })).toHaveAttribute(
    'href',
    '/app/incidents',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Retry sync' }));
  expect(state.outbox.sync).toHaveBeenCalledOnce();
  expect(
    screen.getByRole('link', { name: /Report incident/ }),
  ).toBeInTheDocument();
  await act(async () => {});
});
it('updates incident status and displays server failures without losing the details', async () => {
  get.mockResolvedValue(incident);
  api.patch
    .mockRejectedValueOnce({
      response: { data: { message: 'Update rejected' } },
    })
    .mockResolvedValue({});
  mount(<IncidentDetails />, '/details/i1');
  await screen.findByText('Wire near gate');
  change(/Incident status/, 'Under Review');
  fireEvent.click(screen.getByRole('button', { name: 'Save status' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Update rejected');
  fireEvent.click(screen.getByRole('button', { name: 'Save status' }));
  expect(
    await screen.findByText('Incident status updated.'),
  ).toBeInTheDocument();
  expect(api.patch).toHaveBeenLastCalledWith('/incidents/i1/status', {
    status: 'Under Review',
  });
  await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
});
it('keeps incident review controls hidden from rangers', async () => {
  state.user.role = 'RANGER';
  get.mockResolvedValue({
    ...incident,
    description: '',
    imageUrl: '/uploads/photo.png',
  });
  mount(<IncidentDetails />, '/details/i1');
  expect(
    await screen.findByText('No description provided.'),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Save status' }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('img')).toHaveAttribute('src', '/uploads/photo.png');
});
it.each(['MANAGER', 'RANGER'])(
  'lists patrols for %s with role-appropriate controls',
  async (role) => {
    state.user.role = role;
    get.mockResolvedValue([state.patrol.data]);
    mount(<PatrolManagement />);
    expect(await screen.findByText('East route')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /East route/ })).toHaveAttribute(
      'href',
      '/app/patrols/p1',
    );
    expect(Boolean(screen.queryByRole('link', { name: 'Create patrol' }))).toBe(
      role === 'MANAGER',
    );
  },
);
it('shows an empty patrol list', async () => {
  mount(<PatrolManagement />);
  expect(
    await screen.findByText('No patrols have been assigned yet.'),
  ).toBeInTheDocument();
});
it('assigns a patrol with edited checkpoints, retries a failure, then opens the saved patrol', async () => {
  get.mockResolvedValue([
    { _id: 'r1', name: 'Kasun', role: 'RANGER' },
    { _id: 'm1', name: 'Manager', role: 'MANAGER' },
  ]);
  api.post
    .mockRejectedValueOnce({
      response: { data: { message: 'Ranger unavailable' } },
    })
    .mockResolvedValue({ data: { data: { _id: 'p1' } } });
  mount(<CreatePatrol />);
  await screen.findByLabelText(/Route name/);
  expect(
    screen.queryByRole('option', { name: 'Manager' }),
  ).not.toBeInTheDocument();
  change(/Route name/, 'North route');
  change(/Park \/ area/, 'Yala');
  change(/Assign ranger/, 'r1');
  change(/Scheduled start time/, '2026-10-10T09:00');
  change(/Scheduled end time/, '2026-10-10T12:00');
  fireEvent.click(screen.getByRole('button', { name: /Add checkpoint/ }));
  change(/Checkpoint 1 name/, 'East gate');
  change(/Checkpoint 2 name/, 'River');
  fireEvent.change(screen.getAllByLabelText(/Latitude/)[0], {
    target: { value: '6.45' },
  });
  fireEvent.change(screen.getAllByLabelText(/Longitude/)[0], {
    target: { value: '81.4' },
  });
  fireEvent.click(
    screen.getAllByRole('button', { name: 'Remove checkpoint' })[1],
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Create & assign patrol' }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Ranger unavailable',
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Create & assign patrol' }),
  );
  expect(await screen.findByText('Assigned patrol opened')).toBeInTheDocument();
  expect(api.post).toHaveBeenLastCalledWith(
    '/patrols',
    expect.objectContaining({
      rangerId: 'r1',
      routeName: 'North route',
      checkpoints: [{ name: 'East gate', latitude: '6.45', longitude: '81.4' }],
    }),
  );
});

it('saves a waypoint locally with its photo and clears the form after success', async () => {
  state.user.role = 'RANGER';
  mount(<ActivePatrol />, '/details/p1');
  change(/Waypoint type/, 'Wildlife');
  change(/Latitude/, '6.45');
  change(/Longitude/, '81.4');
  change(/Description/, 'Elephants by river');
  const photo = new File(['photo'], 'field.png', { type: 'image/png' });
  fireEvent.change(screen.getByLabelText(/Photograph/), {
    target: { files: [photo] },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save waypoint' }));
  await screen.findByText(/Waypoint saved locally/);
  expect(saveWaypoint).toHaveBeenCalledWith(
    'r1',
    'p1',
    expect.objectContaining({
      type: 'Wildlife',
      description: 'Elephants by river',
      photo,
    }),
  );
  expect(screen.getByLabelText(/Latitude/)).toHaveValue(null);
  expect(syncWaypoints).toHaveBeenCalledWith('r1');
});
it('retains the waypoint form if local storage fails', async () => {
  state.user.role = 'RANGER';
  saveWaypoint.mockRejectedValue(new Error('Storage full'));
  mount(<ActivePatrol />, '/details/p1');
  change(/Latitude/, '6');
  change(/Longitude/, '81');
  fireEvent.click(screen.getByRole('button', { name: 'Save waypoint' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Storage full');
  expect(screen.getByLabelText(/Latitude/)).toHaveValue(6);
  expect(syncWaypoints).not.toHaveBeenCalled();
});
const complete = () => {
  fireEvent.click(screen.getByRole('button', { name: 'End Patrol' }));
  fireEvent.click(screen.getByRole('button', { name: 'Complete Patrol' }));
};
it('requires confirmation before completing a patrol and synchronizes first', async () => {
  state.user.role = 'RANGER';
  mount(<ActivePatrol />, '/details/p1');
  complete();
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(api.patch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Complete Patrol' }));
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm' }),
  );
  await screen.findByText('Patrol saved');
  expect(api.patch).toHaveBeenCalledWith('/patrols/p1/end', {
    status: 'Completed',
    incompleteReason: '',
  });
  expect(syncWaypoints.mock.invocationCallOrder[0]).toBeLessThan(
    api.patch.mock.invocationCallOrder[0],
  );
  expect(state.reload).toHaveBeenCalled();
});
it('prevents completion when waypoints are still pending', async () => {
  state.user.role = 'RANGER';
  listWaypoints.mockResolvedValue([{ syncStatus: 'PENDING' }]);
  mount(<ActivePatrol />, '/details/p1');
  complete();
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm' }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Sync all pending waypoints',
  );
  expect(api.patch).not.toHaveBeenCalled();
});
it.each(['Other', 'Severe Weather'])(
  'validates early termination and saves reason %s',
  async (reason) => {
    state.user.role = 'RANGER';
    mount(<ActivePatrol />, '/details/p1');
    fireEvent.click(screen.getByRole('button', { name: 'End Patrol' }));
    fireEvent.click(screen.getByRole('button', { name: 'Terminate Early' }));
    const submit = screen.getByRole('button', {
      name: 'Confirm early termination',
    });
    fireEvent.submit(submit.closest('form'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    change(/^Reason for ending early/, reason);
    if (reason === 'Other') {
      fireEvent.submit(submit.closest('form'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      change(/Describe the reason/, '  Bridge collapsed  ');
    }
    fireEvent.submit(submit.closest('form'));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Confirm',
      }),
    );
    await screen.findByText('Patrol saved');
    expect(api.patch).toHaveBeenCalledWith('/patrols/p1/end', {
      status: 'Incomplete',
      incompleteReason: reason,
      ...(reason === 'Other'
        ? { incompleteReasonDetails: 'Bridge collapsed' }
        : {}),
    });
  },
);
it('displays completed patrol summaries and deduplicates local synchronized waypoints', () => {
  state.patrol.data = {
    ...state.patrol.data,
    status: 'Incomplete',
    endTime: '2026-10-10T12:00:00Z',
    durationMinutes: 90,
    incompleteReason: 'Other',
    incompleteReasonDetails: 'Bridge collapsed',
    waypoints: [
      {
        _id: 'w1',
        clientId: 'c1',
        type: 'Checkpoint',
        location: { latitude: 6, longitude: 81 },
      },
    ],
  };
  state.patrol.points = [
    { clientId: 'c1', syncStatus: 'SYNCED' },
    {
      clientId: 'c2',
      syncStatus: 'PENDING',
      latitude: 6,
      longitude: 81,
      type: 'Observation',
      description: 'River flooded',
      syncError: 'Upload failed',
    },
  ];
  mount(<ActivePatrol />, '/details/p1');
  expect(screen.getByText('Bridge collapsed')).toBeInTheDocument();
  expect(screen.getByText('90 minutes')).toBeInTheDocument();
  expect(screen.getAllByText('No note added.')).toHaveLength(1);
  expect(screen.getByText('River flooded')).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Upload failed');
  expect(
    screen.queryByRole('button', { name: 'Save waypoint' }),
  ).not.toBeInTheDocument();
});
it('shows retry errors for pending waypoints', async () => {
  state.patrol.points = [
    { clientId: 'c2', syncStatus: 'PENDING', latitude: 6, longitude: 81 },
  ];
  syncWaypoints.mockRejectedValue(new Error('Still offline'));
  mount(<ActivePatrol />, '/details/p1');
  fireEvent.click(screen.getByRole('button', { name: 'Retry sync' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Still offline');
});
