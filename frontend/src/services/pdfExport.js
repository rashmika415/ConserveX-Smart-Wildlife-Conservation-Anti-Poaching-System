import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from '../components/UI';

function saveDocument(doc, filename) {
  if (import.meta.env?.MODE === 'test') {
    return;
  }
  doc.save(filename);
}

export function exportAllReportsPDF(reports, filter = 'All') {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(30, 74, 56); // Deep forest green
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('CONSERVEX WILDLIFE OPERATIONS', 14, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Community Elephant Sightings Report', 14, 20);

  const timestamp = new Date().toLocaleString();
  doc.setFontSize(8);
  doc.text(`Generated: ${timestamp}`, pageWidth - 14, 20, { align: 'right' });

  // Summary Information
  doc.setTextColor(40, 50, 40);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORT OVERVIEW', 14, 38);

  const totalSightings = reports.length;
  const totalElephants = reports.reduce(
    (sum, r) => sum + (Number(r.numberOfElephants) || 0),
    0,
  );
  const resolvedCount = reports.filter((r) => r.status === 'Resolved').length;
  const newCount = reports.filter((r) => r.status === 'New').length;
  const respondingCount = reports.filter((r) => r.status === 'Responding').length;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Filter Applied: ${filter}   |   Total Reports: ${totalSightings}   |   Total Elephants Observed: ${totalElephants}`,
    14,
    45,
  );
  doc.text(
    `Status Breakdown:  New: ${newCount}   |   Responding: ${respondingCount}   |   Resolved: ${resolvedCount}`,
    14,
    51,
  );

  // Table
  const tableRows = reports.map((r) => [
    formatDate(r.createdAt),
    r.landmark || '—',
    String(r.numberOfElephants || 1),
    r.directionOfMovement || '—',
    r.town ? `${r.town}${r.district ? ', ' + r.district : ''}` : '—',
    r.status || 'New',
    String(r.responses?.length || 0),
  ]);

  autoTable(doc, {
    startY: 57,
    head: [
      [
        'Date & Time',
        'Landmark',
        'Elephants',
        'Direction',
        'Town / District',
        'Status',
        'Responses',
      ],
    ],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 74, 56],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [245, 248, 245],
    },
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(130, 140, 130);
    doc.text(
      `Page ${i} of ${pageCount} — ConserveX Wildlife Protection Operations`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' },
    );
  }

  saveDocument(doc, `ConserveX_Community_Reports_${Date.now()}.pdf`);
}

export function exportAllReportsCSV(reports) {
  const headers = [
    'Report ID',
    'Date Reported',
    'Landmark',
    'Latitude',
    'Longitude',
    'Town',
    'District',
    'Number of Elephants',
    'Direction of Movement',
    'Status',
    'Contact',
    'Description',
    'Responses Count',
  ];

  const rows = reports.map((r) => [
    `"${r._id || ''}"`,
    `"${formatDate(r.createdAt)}"`,
    `"${(r.landmark || '').replace(/"/g, '""')}"`,
    r.location?.latitude ?? '',
    r.location?.longitude ?? '',
    `"${(r.town || '').replace(/"/g, '""')}"`,
    `"${(r.district || '').replace(/"/g, '""')}"`,
    r.numberOfElephants || 1,
    `"${(r.directionOfMovement || '').replace(/"/g, '""')}"`,
    `"${r.status || 'New'}"`,
    `"${(r.contact || '').replace(/"/g, '""')}"`,
    `"${(r.description || '').replace(/"/g, '""')}"`,
    r.responses?.length || 0,
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join(
    '\n',
  );

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `ConserveX_Community_Reports_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportSingleReportPDF(report) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(30, 74, 56);
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('CONSERVEX WILDLIFE OPERATIONS', 14, 14);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('INCIDENT & SIGHTING CASE DOSSIER', 14, 23);

  const docId = report._id ? String(report._id).slice(-8).toUpperCase() : 'UNKNOWN';
  doc.setFontSize(9);
  doc.text(`CASE REF: #${docId}`, pageWidth - 14, 23, { align: 'right' });

  // Status Banner
  const statusColors = {
    New: [29, 78, 216],
    Reviewing: [109, 40, 217],
    Responding: [234, 88, 12],
    Resolved: [21, 128, 61],
    'False Report': [185, 28, 28],
  };
  const color = statusColors[report.status] || [30, 74, 56];
  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(14, 38, 55, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`STATUS: ${String(report.status || 'New').toUpperCase()}`, 18, 44.5);

  doc.setTextColor(80, 90, 80);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Reported: ${formatDate(report.createdAt)}`, 75, 44.5);

  // Section 1: Sighting Details
  let currentY = 56;
  doc.setDrawColor(220, 225, 220);
  doc.setLineWidth(0.5);
  doc.line(14, currentY, pageWidth - 14, currentY);

  currentY += 8;
  doc.setTextColor(30, 74, 56);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. SIGHTING OBSERVATION', 14, currentY);

  currentY += 7;
  const sightingDetails = [
    ['Nearest Landmark:', report.landmark || 'Not provided'],
    ['Elephants Count:', `${report.numberOfElephants || 1} elephant(s)`],
    ['Direction of Movement:', report.directionOfMovement || 'Not supplied'],
    [
      'GPS Coordinates:',
      report.location
        ? `${report.location.latitude}, ${report.location.longitude}`
        : 'Not recorded',
    ],
    ['Town / District:', `${report.town || '—'}${report.district ? ' / ' + report.district : ''}`],
    ['Observer Contact:', report.contact || 'Not provided'],
  ];

  autoTable(doc, {
    startY: currentY,
    body: sightingDetails,
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50, textColor: [50, 60, 50] },
      1: { textColor: [30, 30, 30] },
    },
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // Description block
  doc.setTextColor(30, 74, 56);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Description / Community Notes:', 14, currentY);

  currentY += 5;
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const splitDesc = doc.splitTextToSize(
    report.description || 'No detailed narrative provided with this sighting report.',
    pageWidth - 28,
  );
  doc.text(splitDesc, 14, currentY);

  currentY += splitDesc.length * 4.5 + 8;

  // Section 2: Operational Response Log
  doc.setTextColor(30, 74, 56);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('2. OPERATIONAL RESPONSE LOG', 14, currentY);

  currentY += 4;
  const responses = report.responses || [];
  if (responses.length) {
    const responseRows = [...responses].reverse().map((resp) => [
      resp.action || 'Action logged',
      resp.notes || '—',
      resp.responder?.name || 'Staff Officer',
      formatDate(resp.respondedAt),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Response Action', 'Notes & Details', 'Officer', 'Date & Time']],
      body: responseRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 74, 56],
        textColor: [255, 255, 255],
        fontSize: 8.5,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
      },
    });
    currentY = doc.lastAutoTable.finalY + 12;
  } else {
    currentY += 6;
    doc.setTextColor(110, 120, 110);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.text('No operational response actions logged for this case.', 14, currentY);
    currentY += 14;
  }

  // Sign-off section
  if (currentY + 30 > doc.internal.pageSize.getHeight()) {
    doc.addPage();
    currentY = 25;
  }

  doc.setDrawColor(200, 210, 200);
  doc.line(14, currentY, pageWidth - 14, currentY);
  currentY += 8;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 70, 60);
  doc.text('OFFICER VERIFICATION & AUTHORIZATION', 14, currentY);

  currentY += 12;
  doc.setLineWidth(0.3);
  doc.line(14, currentY, 80, currentY);
  doc.line(pageWidth - 80, currentY, pageWidth - 14, currentY);

  currentY += 4;
  doc.setFont('helvetica', 'normal');
  doc.text('Park Manager / Field Officer Signature', 14, currentY);
  doc.text('Date of Filing', pageWidth - 80, currentY);

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(130, 140, 130);
    doc.text(
      `Case Dossier #${docId} — ConserveX Smart Wildlife Conservation & Anti-Poaching System`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' },
    );
  }

  saveDocument(doc, `Elephant_Case_Report_${docId}.pdf`);
}
