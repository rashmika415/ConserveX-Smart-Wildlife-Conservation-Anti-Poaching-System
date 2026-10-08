import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from '../pages/auth/Login';
import ReportIncident from '../modules/incidents/ReportIncident';
import ReportElephantSighting from '../pages/community/ReportElephantSighting';
import Dashboard from '../pages/shared/Dashboard';
import { LocationInput, PhotoUpload } from '../components/UI';
import { Protected } from '../App';
import { api, get } from '../services/api';
import CommunityReports, {
  CommunityReportDetails,
} from '../modules/community/CommunityReports';
const { login, auth } = vi.hoisted(() => ({
  login: vi.fn(),
  auth: { user: null, loading: false },
}));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ ...auth, login }),
}));
vi.mock('../services/api', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    api: { post: vi.fn(), patch: vi.fn() },
    get: vi.fn(),
  };
});
const mount = (component) => render(<MemoryRouter>{component}</MemoryRouter>);
const change = (label, value) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
beforeEach(() => {
  vi.clearAllMocks();
  auth.user = null;
  auth.loading = false;
});
describe('Login form', () => {
  it('requires email and password, submits credentials and shows API rejection', async () => {
    login.mockRejectedValue({
      response: { data: { message: 'Email or password is incorrect' } },
    });
    mount(<Login />);
    expect(screen.getByLabelText(/Email address/)).toBeRequired();
    expect(screen.getByLabelText(/Password/)).toBeRequired();
    change(/Email address/, 'ranger@wildlife.lk');
    change(/Password/, 'wrong');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email or password is incorrect',
    );
    expect(login).toHaveBeenCalledWith('ranger@wildlife.lk', 'wrong');
  });
  it('navigates to the dashboard after valid login', async () => {
    login.mockResolvedValue({ role: 'RANGER' });
    mount(
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/app" element={<p>Workspace loaded</p>} />
      </Routes>,
    );
    change(/Email address/, 'ranger@wildlife.lk');
    change(/Password/, 'Ranger123!');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Workspace loaded')).toBeInTheDocument();
  });
});
describe('Incident form', () => {
  it('rejects missing incident fields before calling the API', async () => {
    mount(<ReportIncident />);
    fireEvent.submit(
      screen
        .getByRole('button', { name: 'Submit and synchronize report' })
        .closest('form'),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Incident type, latitude, longitude and a short description are required',
    );
    expect(api.post).not.toHaveBeenCalled();
  });
  it('synchronizes an online incident and confirms server receipt', async () => {
    api.post.mockResolvedValue({
      data: { data: { _id: 'incident-1', syncStatus: 'Synced' } },
    });
    mount(<ReportIncident />);
    change(/Incident type/, 'Snare / Trap');
    change(/Latitude/, '6.45');
    change(/Longitude/, '81.4');
    change(/Short description/, 'Wire trap found beside the trail');
    fireEvent.click(
      screen.getByRole('button', { name: 'Submit and synchronize report' }),
    );
    expect(
      await screen.findByText('Incident synchronized successfully'),
    ).toBeInTheDocument();
    expect(api.post.mock.calls[0][1].has('syncStatus')).toBe(false);
    expect(screen.getByText('Synced')).toBeInTheDocument();
  });
});
describe('Public reporting', () => {
  it('submits a landmark-only location and redirects with a saved reference', async () => {
    api.post.mockResolvedValue({ data: { data: { _id: 'report-1' } } });
    mount(
      <Routes>
        <Route path="/" element={<ReportElephantSighting />} />
        <Route path="/report/confirmation" element={<p>Sighting saved</p>} />
      </Routes>,
    );
    change(/Nearest location/, 'Village school');
    change(/Number of elephants/, '3');
    fireEvent.click(
      screen.getByRole('button', { name: 'Submit sighting report' }),
    );
    expect(await screen.findByText('Sighting saved')).toBeInTheDocument();
    expect(api.post.mock.calls[0][0]).toBe('/community-reports');
    expect(api.post.mock.calls[0][1].get('numberOfElephants')).toBe('3');
  });
  it('rejects fractional counts and makes paired GPS coordinates required', () => {
    mount(<ReportElephantSighting />);
    change(/Nearest location/, 'Village school');
    change(/Number of elephants/, '1.5');
    fireEvent.submit(
      screen
        .getByRole('button', { name: 'Submit sighting report' })
        .closest('form'),
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'positive whole number',
    );
    change(/Latitude/, '6.45');
    expect(screen.getByLabelText(/Longitude/)).toBeRequired();
    expect(api.post).not.toHaveBeenCalled();
  });
});
describe('Shared inputs and role protection', () => {
  it('falls back to manual location when GPS is unavailable', () => {
    vi.stubGlobal('navigator', { geolocation: undefined });
    mount(
      <LocationInput
        values={{ latitude: '', longitude: '' }}
        setValues={vi.fn()}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: /Use my current location/ }),
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter coordinates manually',
    );
  });
  it('rejects oversized photos before submitting', () => {
    const onChange = vi.fn();
    mount(<PhotoUpload onChange={onChange} />);
    const photo = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', {
      type: 'image/png',
    });
    fireEvent.change(screen.getByLabelText(/Photograph/), {
      target: { files: [photo] },
    });
    expect(screen.getByText(/under 5 MB/)).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(null);
  });
  it('redirects unauthenticated visitors from protected pages', async () => {
    mount(
      <Routes>
        <Route element={<Protected />}>
          <Route path="/" element={<p>Private</p>} />
        </Route>
        <Route path="/login" element={<p>Please sign in</p>} />
      </Routes>,
    );
    expect(await screen.findByText('Please sign in')).toBeInTheDocument();
    expect(screen.queryByText('Private')).not.toBeInTheDocument();
  });
  it('redirects a ranger away from manager pages', async () => {
    auth.user = { role: 'RANGER' };
    mount(
      <Routes>
        <Route element={<Protected roles={['MANAGER']} />}>
          <Route path="/" element={<p>Private manager page</p>} />
        </Route>
        <Route path="/app" element={<p>Allowed dashboard</p>} />
      </Routes>,
    );
    expect(await screen.findByText('Allowed dashboard')).toBeInTheDocument();
  });
});
describe('Role dashboards', () => {
  it('renders manager metrics and all four connected modules from API data', async () => {
    auth.user = { name: 'Nimal Perera', role: 'MANAGER' };
    get.mockResolvedValue([]);
    mount(<Dashboard />);
    expect(await screen.findByText('Active patrols')).toBeInTheDocument();
    expect(screen.getByText('Open incidents')).toBeInTheDocument();
    expect(screen.getByText('High-risk alerts')).toBeInTheDocument();
    expect(screen.getByText('Community reports')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/incidents');
    expect(get).toHaveBeenCalledWith('/patrols');
    expect(get).toHaveBeenCalledWith('/community-reports');
    expect(get).toHaveBeenCalledWith('/alerts');
  });
  it('shows liaison response metrics without fetching ranger-only modules', async () => {
    auth.user = { name: 'Amali Fernando', role: 'LIAISON' };
    get.mockResolvedValue([]);
    mount(<Dashboard />);
    expect(await screen.findByText('Awaiting response')).toBeInTheDocument();
    expect(get).not.toHaveBeenCalledWith('/incidents');
    expect(get).not.toHaveBeenCalledWith('/patrols');
  });
  it('surfaces loading failure and supports retry', async () => {
    auth.user = { name: 'Kasun Silva', role: 'RANGER' };
    get.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([]);
    mount(<Dashboard />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cannot reach the server',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry dashboard' }));
    await waitFor(() =>
      expect(screen.getByText('Assigned patrols')).toBeInTheDocument(),
    );
  });
});
describe('Community report management', () => {
  it('filters community reports by Resolved status properly', async () => {
    get.mockResolvedValue([
      {
        _id: 'report-1',
        landmark: 'Tank Road',
        numberOfElephants: 2,
        directionOfMovement: 'North',
        status: 'New',
        responses: [],
        createdAt: new Date().toISOString(),
      },
      {
        _id: 'report-2',
        landmark: 'Border Fence',
        numberOfElephants: 4,
        directionOfMovement: 'East',
        status: 'Resolved',
        responses: [{ _id: 'resp-1', action: 'Monitor Situation' }],
        createdAt: new Date().toISOString(),
      },
    ]);
    render(
      <MemoryRouter initialEntries={['/app/community']}>
        <Routes>
          <Route path="/app/community" element={<CommunityReports />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Tank Road')).toBeInTheDocument();
    expect(screen.getByText('Border Fence')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Filter by status/), {
      target: { value: 'Resolved' },
    });
    expect(screen.getByText('Border Fence')).toBeInTheDocument();
    expect(screen.queryByText('Tank Road')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Filter by status/), {
      target: { value: 'New' },
    });
    expect(screen.getByText('Tank Road')).toBeInTheDocument();
    expect(screen.queryByText('Border Fence')).not.toBeInTheDocument();
  });

  it('updates report status to Resolved, saves and redirects back to community reports', async () => {
    get.mockResolvedValue({
      _id: 'report-1',
      landmark: 'Tank Road',
      numberOfElephants: 2,
      status: 'New',
      responses: [],
      createdAt: new Date().toISOString(),
    });
    api.patch.mockResolvedValue({
      data: { success: true, message: 'Report status updated' },
    });

    render(
      <MemoryRouter initialEntries={['/app/community/report-1']}>
        <Routes>
          <Route
            path="/app/community/:id"
            element={<CommunityReportDetails />}
          />
          <Route path="/app/community" element={<p>Back on reports list</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Tank Road')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Report status/), {
      target: { value: 'Resolved' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save status' }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/community-reports/report-1/status',
        { status: 'Resolved' },
      );
    });
    expect(await screen.findByText('Back on reports list')).toBeInTheDocument();
  });

  it('records response with Resolved status and redirects back to community reports', async () => {
    get.mockResolvedValue({
      _id: 'report-2',
      landmark: 'Border Fence',
      numberOfElephants: 3,
      status: 'New',
      responses: [],
      createdAt: new Date().toISOString(),
    });
    api.post.mockResolvedValue({
      data: { success: true, message: 'Response action recorded' },
    });
    api.patch.mockResolvedValue({
      data: { success: true, message: 'Report status updated' },
    });

    render(
      <MemoryRouter initialEntries={['/app/community/report-2']}>
        <Routes>
          <Route
            path="/app/community/:id"
            element={<CommunityReportDetails />}
          />
          <Route path="/app/community" element={<p>Back on reports list</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Border Fence')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Report status/), {
      target: { value: 'Resolved' },
    });
    fireEvent.change(screen.getByLabelText(/Response action/), {
      target: { value: 'Dispatch Ranger' },
    });
    fireEvent.change(screen.getByLabelText(/Response notes/), {
      target: { value: 'Ranger dispatched to site' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Record response' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/community-reports/report-2/response',
        {
          action: 'Dispatch Ranger',
          notes: 'Ranger dispatched to site',
          status: 'Resolved',
        },
      );
    });
    expect(await screen.findByText('Back on reports list')).toBeInTheDocument();
  });
});
