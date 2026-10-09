
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from '../components/UI';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  exportAllReportsPDF,
  exportAllReportsCSV,
  exportSingleReportPDF,
} from '../services/pdfExport';

describe('PDF and CSV export service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockReports = [
    {
      _id: '67053e1a8b9f1a0012345678',
      landmark: 'Palatupana Water Tank',
      location: { latitude: 6.2345, longitude: 81.3456 },
      numberOfElephants: 3,
      directionOfMovement: 'North towards buffer zone',
      status: 'Resolved',
      town: 'Palatupana',
      district: 'Hambantota',
      contact: '0771234567',
      description: 'Group of 3 adult elephants crossing near the boundary tank.',
      createdAt: '2026-10-08T10:30:00.000Z',
      responses: [
        {
          _id: 'resp-1',
          action: 'Dispatch Ranger',
          notes: 'Patrol unit Alpha dispatched to monitor boundary.',
          responder: { name: 'Ranger Kasun' },
          respondedAt: '2026-10-08T10:45:00.000Z',
        },
        {
          _id: 'resp-2',
          action: 'Monitor Situation',
          notes: 'Elephants moved peacefully back into dense sanctuary scrub.',
          responder: { name: 'Manager Nimal' },
          respondedAt: '2026-10-08T11:30:00.000Z',
        },
      ],
    },
    {
      _id: '67053e1a8b9f1a0012345679',
      landmark: 'Katagamuwa Gate',
      location: { latitude: 6.3456, longitude: 81.4567 },
      numberOfElephants: 1,
      directionOfMovement: 'West',
      status: 'New',
      town: 'Kataragama',
      district: 'Monaragala',
      contact: '0719876543',
      description: 'Lone bull elephant observed near agricultural perimeter.',
      createdAt: '2026-10-08T12:00:00.000Z',
      responses: [],
    },
  ];

  it('generates All Reports PDF without errors and saves file', () => {
    expect(() => {
      exportAllReportsPDF(mockReports, 'All');
    }).not.toThrow();
  });

  it('generates All Reports PDF with filtered subset without errors', () => {
    expect(() => {
      exportAllReportsPDF(
        mockReports.filter((r) => r.status === 'Resolved'),
        'Resolved',
      );
    }).not.toThrow();
  });

  it('generates Single Case Dossier PDF for a resolved report with response history', () => {
    expect(() => {
      exportSingleReportPDF(mockReports[0]);
    }).not.toThrow();
  });

  it('generates Single Case Dossier PDF for a new report without responses or location', () => {
    const minimalReport = {
      _id: '67053e1a8b9f1a0012345699',
      landmark: 'Village Border Road',
      numberOfElephants: 2,
      status: 'New',
      createdAt: '2026-10-08T14:00:00.000Z',
    };
    expect(() => {
      exportSingleReportPDF(minimalReport);
    }).not.toThrow();
  });

  it('generates CSV export and triggers browser anchor click', () => {
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const removeChildSpy = vi.spyOn(document.body, 'removeChild');
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    expect(() => {
      exportAllReportsCSV(mockReports);
    }).not.toThrow();

    expect(appendChildSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
  });
});
