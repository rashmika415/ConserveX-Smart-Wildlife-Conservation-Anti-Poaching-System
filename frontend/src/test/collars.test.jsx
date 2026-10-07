import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AnimalTracking from '../modules/collars/AnimalTracking';
import Alerts, { AlertDetails } from '../modules/collars/Alerts';
import { api } from '../services/api';

const { resources, reload, user } = vi.hoisted(() => ({
  resources: {},
  reload: vi.fn(),
  user: { role: 'MANAGER' },
}));
vi.mock('../hooks/useResource', () => ({
  useResource: (path) => ({
    data: resources[path],
    loading: false,
    error: '',
    reload,
  }),
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user }) }));
vi.mock('../services/api', () => ({
  api: { post: vi.fn(), get: vi.fn(), patch: vi.fn() },
  errorMessage: (error) =>
    error.response?.data?.message || 'Cannot reach the server',
  photoUrl: (path) => path,
}));

beforeEach(() => {
  vi.clearAllMocks();
  user.role = 'MANAGER';
  delete resources['/alerts'];
  delete resources['/alerts/alert-1'];
  resources['/animals'] = [
    {
      _id: 'animal-1',
      animalId: 'E-042',
      tagName: 'Elephant E-042',
      collarId: 'GPS-C102',
      status: 'Monitored',
      collar: { status: 'Active', batteryLevel: 86 },
    },
  ];
  resources['/risk-zones'] = [
    {
      _id: 'zone-1',
      zoneName: 'Village Boundary',
      centerLatitude: 6.45,
      centerLongitude: 81.4,
      radius: 1500,
      riskLevel: 'High',
    },
  ];
});

const mountTracking = () =>
  render(
    <MemoryRouter>
      <AnimalTracking />
    </MemoryRouter>,
  );
const mountAlertDetails = () =>
  render(
    <MemoryRouter initialEntries={['/alerts/alert-1']}>
      <Routes>
        <Route path="/alerts/:id" element={<AlertDetails />} />
      </Routes>
    </MemoryRouter>,
  );

describe('Collar monitoring screen', () => {
  it('shows safe and high-risk simulator outcomes with the submitted coordinates', async () => {
    api.post
      .mockResolvedValueOnce({ data: { data: { alerts: [] } } })
      .mockResolvedValueOnce({
        data: { data: { alerts: [{ _id: 'alert-1' }] } },
      });
    mountTracking();
    fireEvent.change(screen.getByLabelText(/GPS collar/), {
      target: { value: 'GPS-C102' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Simulate Collar Reading' }),
    );
    expect(
      await screen.findByText(/Outside high-risk zones/),
    ).toBeInTheDocument();
    expect(api.post).toHaveBeenNthCalledWith(1, '/collar-readings', {
      collarId: 'GPS-C102',
      latitude: 0,
      longitude: 0,
    });
    fireEvent.change(screen.getByLabelText('Simulated location'), {
      target: { value: 'zone-1' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Simulate Collar Reading' }),
    );
    expect(
      await screen.findByText(/high-risk alert\(s\) created or updated/),
    ).toBeInTheDocument();
    expect(api.post).toHaveBeenNthCalledWith(2, '/collar-readings', {
      collarId: 'GPS-C102',
      latitude: 6.45,
      longitude: 81.4,
    });
    expect(screen.getByRole('link', { name: /View alert/ })).toHaveAttribute(
      'href',
      '/app/alerts/alert-1',
    );
  });

  it('explains why a reading inside a zone did not create another alert', async () => {
    api.post.mockResolvedValue({
      data: { data: { alerts: [], insideRiskZone: true } },
    });
    mountTracking();
    fireEvent.change(screen.getByLabelText(/GPS collar/), {
      target: { value: 'GPS-C102' },
    });
    fireEvent.change(screen.getByLabelText('Simulated location'), {
      target: { value: 'zone-1' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Simulate Collar Reading' }),
    );
    expect(
      await screen.findByText(
        /No new alert until the animal exits and re-enters/,
      ),
    ).toBeInTheDocument();
  });

  it('loads saved collar reading history', async () => {
    api.get.mockResolvedValue({
      data: {
        data: [
          {
            _id: 'reading-1',
            timestamp: '2026-10-06T00:00:00.000Z',
            latitude: 6.45,
            longitude: 81.4,
          },
        ],
      },
    });
    mountTracking();
    fireEvent.click(
      screen.getByRole('button', { name: 'Collar details & reading history' }),
    );
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/collar-readings/GPS-C102'),
    );
    expect(
      await screen.findByText('GPS-C102 · Recent readings'),
    ).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '6.45' })).toBeInTheDocument();
  });

  it('lets a manager simulate an invalid collar and shows the API error', async () => {
    api.post.mockRejectedValue({
      response: { data: { message: 'Collar not found' } },
    });
    mountTracking();
    fireEvent.change(screen.getByLabelText(/GPS collar/), {
      target: { value: 'INVALID-DEMO-COLLAR' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Simulate Collar Reading' }),
    );
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/collar-readings', {
        collarId: 'INVALID-DEMO-COLLAR',
        latitude: 0,
        longitude: 0,
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Collar not found',
    );
    expect(screen.queryByText(/Reading saved/)).not.toBeInTheDocument();
  });

  it('creates a risk zone and reloads the simulator choices', async () => {
    api.post.mockResolvedValue({ data: { data: { _id: 'new-zone' } } });
    mountTracking();
    fireEvent.change(screen.getByLabelText(/Zone name/), {
      target: { value: 'Test crossing' },
    });
    fireEvent.change(screen.getByLabelText(/Zone centre latitude/), {
      target: { value: '6.4' },
    });
    fireEvent.change(screen.getByLabelText(/Zone centre longitude/), {
      target: { value: '81.2' },
    });
    fireEvent.change(screen.getByLabelText(/Radius \(metres\)/), {
      target: { value: '500' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create risk zone' }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/risk-zones',
        expect.objectContaining({
          zoneName: 'Test crossing',
          centerLatitude: '6.4',
          centerLongitude: '81.2',
          radius: '500',
          riskLevel: 'High',
        }),
      ),
    );
    expect(await screen.findByText(/Risk zone created/)).toBeInTheDocument();
    expect(reload).toHaveBeenCalled();
  });

  it('shows validation errors returned when zone creation fails', async () => {
    api.post.mockRejectedValue({
      response: { data: { message: 'Zone name already exists' } },
    });
    mountTracking();
    fireEvent.change(screen.getByLabelText(/Zone name/), {
      target: { value: 'Existing zone' },
    });
    fireEvent.change(screen.getByLabelText(/Zone centre latitude/), {
      target: { value: '6.4' },
    });
    fireEvent.change(screen.getByLabelText(/Zone centre longitude/), {
      target: { value: '81.2' },
    });
    fireEvent.change(screen.getByLabelText(/Radius \(metres\)/), {
      target: { value: '500' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create risk zone' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Zone name already exists',
    );
    expect(reload).not.toHaveBeenCalled();
  });
});

describe('Alert response screen', () => {
  it('filters open, acknowledged, and resolved alerts without hiding history', () => {
    resources['/alerts'] = [
      {
        _id: 'alert-1',
        status: 'New',
        priority: 'High',
        message: 'New entry',
        animalId: { tagName: 'Elephant one' },
        zoneId: { zoneName: 'North' },
      },
      {
        _id: 'alert-2',
        status: 'Acknowledged',
        priority: 'Critical',
        message: 'Responder assigned',
        animalId: { tagName: 'Elephant two' },
        zoneId: { zoneName: 'East' },
      },
      {
        _id: 'alert-3',
        status: 'Resolved',
        priority: 'High',
        message: 'Closed entry',
        animalId: { tagName: 'Elephant three' },
        zoneId: { zoneName: 'South' },
      },
    ];
    render(
      <MemoryRouter>
        <Alerts />
      </MemoryRouter>,
    );
    expect(screen.getByText('New entry')).toBeInTheDocument();
    expect(screen.getByText('Responder assigned')).toBeInTheDocument();
    expect(screen.queryByText('Closed entry')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filter alerts'), {
      target: { value: 'Resolved' },
    });
    expect(screen.getByText('Closed entry')).toBeInTheDocument();
    expect(screen.queryByText('New entry')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filter alerts'), {
      target: { value: 'All' },
    });
    expect(screen.getAllByRole('link')).toHaveLength(3);
    fireEvent.change(screen.getByLabelText('Filter alerts'), {
      target: { value: 'Acknowledged' },
    });
    expect(screen.getByText('Responder assigned')).toBeInTheDocument();
    expect(screen.queryByText('Closed entry')).not.toBeInTheDocument();
  });

  it('shows an empty state when no alerts match the selected filter', () => {
    resources['/alerts'] = [
      {
        _id: 'alert-1',
        status: 'Resolved',
        priority: 'High',
        message: 'Closed entry',
      },
    ];
    render(
      <MemoryRouter>
        <Alerts />
      </MemoryRouter>,
    );
    expect(screen.getByText('No alerts match this view.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filter alerts'), {
      target: { value: 'All' },
    });
    expect(screen.getByText('Closed entry')).toBeInTheDocument();
  });

  it('allows a liaison to acknowledge a new alert and refresh its details', async () => {
    user.role = 'LIAISON';
    resources['/alerts/alert-1'] = {
      _id: 'alert-1',
      status: 'New',
      priority: 'High',
      collarId: 'GPS-C102',
      animalId: { tagName: 'Elephant E-042' },
      zoneId: { zoneName: 'Village Boundary' },
    };
    api.patch.mockResolvedValue({ data: { message: 'Alert acknowledged' } });
    mountAlertDetails();
    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge alert' }));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith('/alerts/alert-1/acknowledge'),
    );
    expect(await screen.findByText('Alert acknowledged')).toBeInTheDocument();
    expect(reload).toHaveBeenCalled();
  });

  it('lets a manager cancel, then confirm resolving an alert', async () => {
    resources['/alerts/alert-1'] = {
      _id: 'alert-1',
      status: 'New',
      priority: 'Critical',
      collarId: 'GPS-C102',
      animalId: { tagName: 'Elephant E-042' },
      zoneId: { zoneName: 'Village Boundary', radius: 1500 },
      latitude: 6.45,
      longitude: 81.4,
    };
    api.patch.mockResolvedValue({ data: { message: 'Alert resolved' } });
    mountAlertDetails();
    fireEvent.click(screen.getByRole('button', { name: 'Resolve alert' }));
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'leaves the zone and then re-enters',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Resolve alert' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith('/alerts/alert-1/resolve'),
    );
    expect(await screen.findByText('Alert resolved')).toBeInTheDocument();
    expect(reload).toHaveBeenCalled();
  });

  it('reports acknowledgement failures without claiming success', async () => {
    user.role = 'RANGER';
    resources['/alerts/alert-1'] = {
      _id: 'alert-1',
      status: 'New',
      priority: 'High',
      collarId: 'GPS-C102',
      animalId: { tagName: 'Elephant E-042' },
      zoneId: { zoneName: 'Village Boundary' },
    };
    api.patch.mockRejectedValue({
      response: { data: { message: 'Only new alerts can be acknowledged' } },
    });
    mountAlertDetails();
    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge alert' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Only new alerts can be acknowledged',
    );
    expect(reload).not.toHaveBeenCalled();
  });

  it('shows responder and resolution history without offering another action', () => {
    resources['/alerts/alert-1'] = {
      _id: 'alert-1',
      status: 'Resolved',
      priority: 'High',
      collarId: 'GPS-C102',
      animalId: { tagName: 'Elephant E-042' },
      zoneId: { zoneName: 'Village Boundary' },
      acknowledgedBy: { name: 'Ranger Kasun' },
      acknowledgedAt: '2026-10-06T00:00:00.000Z',
      resolvedBy: { name: 'Manager Nimal' },
      resolvedAt: '2026-10-06T01:00:00.000Z',
    };
    mountAlertDetails();
    expect(screen.getByText('Ranger Kasun')).toBeInTheDocument();
    expect(screen.getByText('Manager Nimal')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Resolve alert' }),
    ).not.toBeInTheDocument();
  });
});
