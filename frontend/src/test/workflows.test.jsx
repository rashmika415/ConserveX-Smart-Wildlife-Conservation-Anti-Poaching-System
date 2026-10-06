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
const { login, auth } = vi.hoisted(() => ({
  login: vi.fn(),
  auth: { user: null, loading: false },
}));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ ...auth, login }),
}));
vi.mock('../services/api', async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, api: { post: vi.fn() }, get: vi.fn() };
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
        .getByRole('button', { name: 'Submit incident report' })
        .closest('form'),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Incident type, latitude and longitude are required',
    );
    expect(api.post).not.toHaveBeenCalled();
  });
  it('saves an offline simulation as Pending through the API and confirms it honestly', async () => {
    api.post.mockResolvedValue({
      data: { data: { _id: 'incident-1', syncStatus: 'Pending' } },
    });
    mount(<ReportIncident />);
    change(/Incident type/, 'Snare / Trap');
    change(/Latitude/, '6.45');
    change(/Longitude/, '81.4');
    fireEvent.click(screen.getByLabelText('Simulate Offline'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Submit incident report' }),
    );
    expect(
      await screen.findByText('Incident reported successfully'),
    ).toBeInTheDocument();
    expect(api.post.mock.calls[0][1].get('syncStatus')).toBe('Pending');
    expect(
      screen.getByText(/already saved in the database/),
    ).toBeInTheDocument();
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
