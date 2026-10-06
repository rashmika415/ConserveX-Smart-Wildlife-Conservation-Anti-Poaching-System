import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AnimalTracking from '../modules/collars/AnimalTracking';
import { AlertDetails } from '../modules/collars/Alerts';
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

describe('Collar monitoring screen', () => {
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
    render(
      <MemoryRouter initialEntries={['/alerts/alert-1']}>
        <Routes>
          <Route path="/alerts/:id" element={<AlertDetails />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge alert' }));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith('/alerts/alert-1/acknowledge'),
    );
    expect(await screen.findByText('Alert acknowledged')).toBeInTheDocument();
    expect(reload).toHaveBeenCalled();
  });
});
