import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CommunityHome from '../pages/community/CommunityHome';
import ReportElephantSighting from '../pages/community/ReportElephantSighting';
import ReportConfirmation from '../pages/community/ReportConfirmation';
import CommunityReports, {
  CommunityReportDetails,
} from '../modules/community/CommunityReports';
import { api, get } from '../services/api';
import {
  exportAllReportsPDF,
  exportAllReportsCSV,
  exportSingleReportPDF,
} from '../services/pdfExport';

const { resources, user } = vi.hoisted(() => ({
  resources: {},
  user: { role: 'LIAISON', name: 'Amali Fernando' },
}));

vi.mock('../hooks/useResource', () => ({
  useResource: (path) => ({
    data: resources[path],
    loading: false,
    error: '',
  }),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user }),
}));

vi.mock('../services/api', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    api: {
      post: vi.fn(),
      get: vi.fn(),
      patch: vi.fn(),
    },
    get: vi.fn(),
  };
});

vi.mock('../services/pdfExport', () => ({
  exportAllReportsPDF: vi.fn(),
  exportAllReportsCSV: vi.fn(),
  exportSingleReportPDF: vi.fn(),
}));

const mockCommunitySightings = [
  {
    _id: 'report-001',
    landmark: 'Palatupana Water Tank',
    numberOfElephants: 3,
    directionOfMovement: 'North towards buffer zone',
    reportType: 'Elephant Sighting',
    status: 'New',
    town: 'Palatupana',
    district: 'Hambantota',
    contact: '0771234567',
    description: '3 adult elephants drinking at the tank.',
    imageUrl: 'uploads/tank.jpg',
    location: { type: 'Point', coordinates: [81.35, 6.25] },
    corroborated: false,
    createdAt: '2026-10-08T08:00:00.000Z',
    responses: [],
  },
  {
    _id: 'report-002',
    landmark: 'Yala Buffer Paddy Fields',
    numberOfElephants: 2,
    directionOfMovement: 'West into village farms',
    reportType: 'Crop-Raiding Incident',
    status: 'Responding',
    town: 'Tissamaharama',
    district: 'Hambantota',
    contact: '0719876543',
    description: 'Elephants broke through boundary fence into paddy fields.',
    imageUrl: 'uploads/crop.jpg',
    location: { type: 'Point', coordinates: [81.3, 6.28] },
    corroborated: true,
    createdAt: '2026-10-08T09:30:00.000Z',
    responses: [
      {
        _id: 'resp-1',
        action: 'Dispatch Ranger',
        notes: 'Dispatched patrol unit to secure perimeter.',
        responder: { name: 'Amali Fernando' },
        respondedAt: '2026-10-08T09:45:00.000Z',
      },
    ],
  },
  {
    _id: 'report-003',
    landmark: 'Menik River Crossing',
    numberOfElephants: 4,
    directionOfMovement: 'South towards sanctuary',
    reportType: 'Elephant Sighting',
    status: 'Resolved',
    town: 'Kataragama',
    district: 'Monaragala',
    contact: '0754443322',
    description: 'Herd moved back into deep sanctuary forest.',
    location: { type: 'Point', coordinates: [81.33, 6.4] },
    corroborated: false,
    createdAt: '2026-10-08T06:00:00.000Z',
    responses: [
      {
        _id: 'resp-2',
        action: 'Monitor Situation',
        notes: 'Herd observed safely within boundary.',
        responder: { name: 'Nimal Perera' },
        respondedAt: '2026-10-08T07:15:00.000Z',
      },
    ],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  user.role = 'LIAISON';
  user.name = 'Amali Fernando';
  resources['/community-reports'] = [...mockCommunitySightings];
  resources['/community-reports/report-001'] = { ...mockCommunitySightings[0] };
  resources['/community-reports/report-002'] = { ...mockCommunitySightings[1] };
});

describe('Part 4: Community Reporting Channel (Weerasooriya IT23577138)', () => {
  describe('1. Public Landing & SMS Reporting Channel', () => {
    it('renders hero action buttons and offline SMS instructions', () => {
      render(
        <MemoryRouter>
          <CommunityHome />
        </MemoryRouter>,
      );

      expect(screen.getByText('Report Elephant Sighting')).toBeInTheDocument();
      expect(screen.getByText('Report Crop-Raiding')).toBeInTheDocument();
      expect(screen.getByText(/SMS to 1990/)).toBeInTheDocument();
      expect(screen.getByText(/Offline reporting:/)).toBeInTheDocument();
      expect(screen.getByText(/ELEPHANT <landmark> \[count\]/)).toBeInTheDocument();
    });

    it('opens SMS simulator, sends structured SMS, and redirects back to home with receipt banner', async () => {
      api.post.mockResolvedValueOnce({
        data: {
          data: {
            reply:
              'Report received for North Waterhole. Wildlife rangers and liaison officers notified.',
          },
        },
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <CommunityHome />
        </MemoryRouter>,
      );

      // Open SMS simulator modal
      fireEvent.click(screen.getByRole('button', { name: 'Simulate SMS' }));
      expect(
        screen.getByRole('heading', { name: /SMS Short-Code Reporting \(1990\)/ }),
      ).toBeInTheDocument();

      // Enter SMS sender & message
      fireEvent.change(screen.getByLabelText(/Sender phone number/), {
        target: { value: '0771234567' },
      });
      fireEvent.change(screen.getByLabelText(/SMS Message content/), {
        target: { value: 'ELEPHANT North Waterhole 3' },
      });

      // Submit SMS
      fireEvent.click(screen.getByRole('button', { name: 'Send SMS Report' }));

      expect(api.post).toHaveBeenCalledWith('/community-reports/sms', {
        message: 'ELEPHANT North Waterhole 3',
        sender: '0771234567',
      });

      // Modal displays confirmation and redirects
      expect(
        await screen.findByText(/Report received for North Waterhole/),
      ).toBeInTheDocument();
    });
  });

  describe('2. Public Incident & Elephant Sighting Form', () => {
    it('toggles report category between Elephant Sighting and Crop-Raiding Incident', () => {
      render(
        <MemoryRouter initialEntries={['/report']}>
          <ReportElephantSighting />
        </MemoryRouter>,
      );

      expect(
        screen.getByRole('heading', { name: 'Report an elephant sighting' }),
      ).toBeInTheDocument();

      // Click Crop-Raiding category
      fireEvent.click(
        screen.getByRole('button', { name: /Crop-Raiding Incident/ }),
      );
      expect(
        screen.getByRole('heading', { name: 'Report a crop-raiding incident' }),
      ).toBeInTheDocument();
    });

    it('adjusts elephant count with stepper buttons', () => {
      render(
        <MemoryRouter initialEntries={['/report']}>
          <ReportElephantSighting />
        </MemoryRouter>,
      );

      const countInput = screen.getByLabelText(/Number of elephants/);
      expect(countInput).toHaveValue(1);

      // Click increment
      fireEvent.click(
        screen.getByRole('button', { name: 'Increase elephant count' }),
      );
      expect(countInput).toHaveValue(2);

      // Click decrement
      fireEvent.click(
        screen.getByRole('button', { name: 'Decrease elephant count' }),
      );
      expect(countInput).toHaveValue(1);
    });

    it('attaches a photo, shows the preview thumbnail with remove button, and allows removing it', () => {
      render(
        <MemoryRouter initialEntries={['/report']}>
          <ReportElephantSighting />
        </MemoryRouter>,
      );

      const file = new File(['fake-elephant-image'], 'elephant.jpg', {
        type: 'image/jpeg',
      });
      const fileInput = screen.getByLabelText(/Photograph \(optional\)/);

      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(screen.getByText('elephant.jpg')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Remove photo' }),
      ).toBeInTheDocument();

      // Remove photo
      fireEvent.click(screen.getByRole('button', { name: 'Remove photo' }));
      expect(screen.queryByText('elephant.jpg')).not.toBeInTheDocument();
    });

    it('queues report to localStorage when offline (PDF Page 20 Exception Flow)', async () => {
      vi.stubGlobal('navigator', { ...window.navigator, onLine: false });

      render(
        <MemoryRouter initialEntries={['/report']}>
          <Routes>
            <Route path="/report" element={<ReportElephantSighting />} />
            <Route
              path="/report/confirmation"
              element={<p>Confirmation Screen</p>}
            />
          </Routes>
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText(/Nearest location \/ landmark/), {
        target: { value: 'Remote Jungle Boundary' },
      });

      fireEvent.click(
        screen.getByRole('button', { name: 'Submit sighting report' }),
      );

      // Verify queued in localStorage
      const queued = JSON.parse(
        localStorage.getItem('conservex_offline_sightings') || '[]',
      );
      expect(queued).toHaveLength(1);
      expect(queued[0].landmark).toBe('Remote Jungle Boundary');
      expect(
        await screen.findByText('Confirmation Screen'),
      ).toBeInTheDocument();
    });

    it('submits valid sighting online and emits new-community-report event', async () => {
      vi.stubGlobal('navigator', { ...window.navigator, onLine: true });
      api.post.mockResolvedValueOnce({
        data: { data: { _id: 'report-new-123', corroborated: false } },
      });

      const eventSpy = vi.fn();
      window.addEventListener('new-community-report', eventSpy);

      render(
        <MemoryRouter initialEntries={['/report']}>
          <Routes>
            <Route path="/report" element={<ReportElephantSighting />} />
            <Route
              path="/report/confirmation"
              element={<p>Confirmation Screen</p>}
            />
          </Routes>
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText(/Nearest location \/ landmark/), {
        target: { value: 'Kataragama Boundary Road' },
      });

      fireEvent.click(
        screen.getByRole('button', { name: 'Submit sighting report' }),
      );

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/community-reports',
          expect.any(FormData),
        );
      });
      expect(eventSpy).toHaveBeenCalled();
      expect(
        await screen.findByText('Confirmation Screen'),
      ).toBeInTheDocument();

      window.removeEventListener('new-community-report', eventSpy);
    });
  });

  describe('3. Report Confirmation Page', () => {
    it('displays formatted reference code #CR-YYYY-XXXX and recipient notification badges', () => {
      render(
        <MemoryRouter
          initialEntries={[
            {
              pathname: '/report/confirmation',
              state: { id: '67053e1a8b9f1a0012345678' },
            },
          ]}
        >
          <ReportConfirmation />
        </MemoryRouter>,
      );

      expect(screen.getByText('Report Submitted!')).toBeInTheDocument();
      expect(screen.getByText(/#CR-2026-5678/)).toBeInTheDocument();
      expect(
        screen.getByText('On-duty Park Rangers notified'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Community Liaison Officer notified'),
      ).toBeInTheDocument();
    });

    it('displays corroborating sighting notice when duplicate sighting is detected', () => {
      render(
        <MemoryRouter
          initialEntries={[
            {
              pathname: '/report/confirmation',
              state: { id: 'report-123', corroborated: true },
            },
          ]}
        >
          <ReportConfirmation />
        </MemoryRouter>,
      );

      expect(
        screen.getByText(/Corroborating Sighting Confirmed:/),
      ).toBeInTheDocument();
    });
  });

  describe('4. Community Reports Management & Filtering', () => {
    it('filters sightings by status and renders category and corroboration badges', () => {
      render(
        <MemoryRouter initialEntries={['/app/community']}>
          <CommunityReports />
        </MemoryRouter>,
      );

      expect(screen.getByText('Palatupana Water Tank')).toBeInTheDocument();
      expect(
        screen.getByText('Yala Buffer Paddy Fields'),
      ).toBeInTheDocument();
      expect(screen.getByText('🌾 Crop-Raiding')).toBeInTheDocument();
      expect(screen.getByText('✓ Corroborated')).toBeInTheDocument();

      // Filter by Resolved
      fireEvent.change(screen.getByLabelText(/Filter by status/), {
        target: { value: 'Resolved' },
      });

      expect(screen.getByText('Menik River Crossing')).toBeInTheDocument();
      expect(
        screen.queryByText('Palatupana Water Tank'),
      ).not.toBeInTheDocument();
    });

    it('triggers PDF and CSV export handlers when buttons are clicked', () => {
      render(
        <MemoryRouter initialEntries={['/app/community']}>
          <CommunityReports />
        </MemoryRouter>,
      );

      fireEvent.click(screen.getByRole('button', { name: /Download PDF/ }));
      expect(exportAllReportsPDF).toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: /Export CSV/ }));
      expect(exportAllReportsCSV).toHaveBeenCalled();
    });
  });

  describe('5. Ranger Tactical Sighting Intel Modal (Role: RANGER)', () => {
    it('opens in-page tactical quick-view modal for field Rangers preserving citizen privacy', async () => {
      user.role = 'RANGER';
      user.name = 'Ranger Kasun';

      render(
        <MemoryRouter initialEntries={['/app/community']}>
          <CommunityReports />
        </MemoryRouter>,
      );

      // Clicking a record opens modal instead of navigating to office URL
      fireEvent.click(screen.getByText('Yala Buffer Paddy Fields'));

      expect(
        await screen.findByText('FIELD RANGER SIGHTING INTEL'),
      ).toBeInTheDocument();

      const modal = screen.getByRole('dialog', { name: 'Tactical Sighting Details' });
      expect(
        within(modal).getByText(/Field Ranger Notice:/),
      ).toBeInTheDocument();
      expect(
        within(modal).getByText(/Villager contact phone numbers are restricted/),
      ).toBeInTheDocument();
      expect(within(modal).getByText('2')).toBeInTheDocument(); // Elephants
      expect(
        within(modal).getByText('West into village farms'),
      ).toBeInTheDocument();
      expect(
        within(modal).getByText('Dispatched patrol unit to secure perimeter.'),
      ).toBeInTheDocument();

      // Close modal
      fireEvent.click(
        within(modal).getByRole('button', { name: 'Close Sighting View' }),
      );
      expect(
        screen.queryByText('FIELD RANGER SIGHTING INTEL'),
      ).not.toBeInTheDocument();
    });
  });

  describe('6. Liaison Officer Response Workflow', () => {
    it('renders report details, allows recording response actions, and downloads single case PDF', async () => {
      api.post.mockResolvedValueOnce({ data: { message: 'Response recorded' } });
      api.patch.mockResolvedValueOnce({ data: { message: 'Status updated' } });

      render(
        <MemoryRouter initialEntries={['/app/community/report-001']}>
          <Routes>
            <Route
              path="/app/community/:id"
              element={<CommunityReportDetails />}
            />
            <Route
              path="/app/community"
              element={<p>Community Reports Home</p>}
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Palatupana Water Tank')).toBeInTheDocument();
      expect(screen.getByText('0771234567')).toBeInTheDocument();
      expect(screen.getByText(/Palatupana · Hambantota/)).toBeInTheDocument();

      // Download single report PDF
      fireEvent.click(screen.getByRole('button', { name: /Download Case PDF/ }));
      expect(exportSingleReportPDF).toHaveBeenCalledWith(
        expect.objectContaining({ landmark: 'Palatupana Water Tank' }),
      );

      // Record Response Action
      fireEvent.change(screen.getByLabelText(/Response action/), {
        target: { value: 'Dispatch Ranger' },
      });
      fireEvent.change(screen.getByLabelText(/Response notes/), {
        target: { value: 'Dispatching Ranger Unit 4.' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Record response' }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/community-reports/report-001/response',
          expect.objectContaining({
            action: 'Dispatch Ranger',
            notes: 'Dispatching Ranger Unit 4.',
          }),
        );
      });

      expect(
        await screen.findByText('Community Reports Home'),
      ).toBeInTheDocument();
    });
  });
});
