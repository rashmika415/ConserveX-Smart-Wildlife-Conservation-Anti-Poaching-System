import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useResource } from '../../hooks/useResource';
import { api, errorMessage } from '../../services/api';
import {
  PageHeader,
  ResourceState,
  EmptyState,
  StatusBadge,
  formatDate,
  FormInput,
  Feedback,
  LocationMap,
  Photo,
} from '../../components/UI';
import { FileDown, Download, Check } from 'lucide-react';
import {
  exportAllReportsPDF,
  exportAllReportsCSV,
  exportSingleReportPDF,
} from '../../services/pdfExport';
import { useAuth } from '../../context/AuthContext';
const statuses = ['New', 'Reviewing', 'Responding', 'Resolved', 'False Report'];

function CommunityStatusBadge({ status }) {
  if (status === 'Resolved') {
    return (
      <span className="badge badge-resolved badge-with-icon">
        <Check size={12} strokeWidth={2.5} aria-hidden="true" /> Resolved
      </span>
    );
  }
  return <StatusBadge status={status} />;
}
export default function CommunityReports() {
  const auth = useAuth?.() || null;
  const user = auth?.user;
  const isRanger = user?.role === 'RANGER';
  const resource = useResource('/community-reports');
  const [filter, setFilter] = useState('All');
  const [selectedReport, setSelectedReport] = useState(null);

  const records =
    resource.data?.filter(
      (item) =>
        filter === 'All' ||
        String(item.status).trim().toLowerCase() ===
          filter.trim().toLowerCase(),
    ) || [];
  return (
    <>
      <PageHeader
        eyebrow="COMMUNITY RESPONSE"
        title="Community reports"
        description="Local observations. Coordinated conservation action."
      >
        <button
          type="button"
          className="button secondary"
          onClick={() => exportAllReportsPDF(records, filter)}
          disabled={!records.length}
        >
          <FileDown size={16} /> Download PDF
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={() => exportAllReportsCSV(records)}
          disabled={!records.length}
        >
          <Download size={16} /> Export CSV
        </button>
      </PageHeader>
      <section className="panel">
        <div className="section-heading">
          <h2>Elephant sightings</h2>
          <FormInput
            label="Filter by status"
            options={['All', ...statuses]}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <ResourceState resource={resource}>
          {records.length ? (
            <div className="record-list">
              {records.map((item) => {
                const isCrop = item.reportType === 'Crop-Raiding Incident';
                const isCorroborated = Boolean(item.corroborated);
                const cardContent = (
                  <>
                    <span className="record-icon">{item.numberOfElephants}</span>
                    <div className="record-main">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <strong>{item.landmark}</strong>
                        {isCrop && (
                          <span className="badge badge-crop">🌾 Crop-Raiding</span>
                        )}
                        {isCorroborated && (
                          <span className="badge badge-corroborated">✓ Corroborated</span>
                        )}
                      </div>
                      <span>
                        {item.numberOfElephants} elephant
                        {item.numberOfElephants > 1 ? 's' : ''} ·{' '}
                        {item.directionOfMovement || 'Direction not provided'}
                      </span>
                      <small>
                        {formatDate(item.createdAt)} · {item.responses?.length || 0}{' '}
                        response actions
                      </small>
                    </div>
                    <div className="record-badges">
                      <CommunityStatusBadge status={item.status} />
                    </div>
                  </>
                );

                return isRanger ? (
                  <button
                    type="button"
                    className="record"
                    key={item._id}
                    onClick={() => setSelectedReport(item)}
                    style={{ textAlign: 'left', width: '100%', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
                  >
                    {cardContent}
                  </button>
                ) : (
                  <Link
                    className="record"
                    key={item._id}
                    to={`/app/community/${item._id}`}
                  >
                    {cardContent}
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState message="No community reports match this view." />
          )}
        </ResourceState>
      </section>

      {selectedReport && (
        <div className="modal-backdrop" onClick={() => setSelectedReport(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Tactical Sighting Details"
          >
            <div className="section-heading">
              <div>
                <span className="eyebrow">FIELD RANGER SIGHTING INTEL</span>
                <h2>{selectedReport.landmark}</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSelectedReport(null)}
              >
                ✕
              </button>
            </div>

            <div className="ranger-quickview-panel">
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <CommunityStatusBadge status={selectedReport.status} />
                {selectedReport.reportType === 'Crop-Raiding Incident' && (
                  <span className="badge badge-crop">🌾 Crop-Raiding Incident</span>
                )}
                {selectedReport.corroborated && (
                  <span className="badge badge-corroborated">✓ Corroborated Report</span>
                )}
              </div>

              <p className="ranger-tactical-note">
                <strong>Field Ranger Notice:</strong> Villager contact phone numbers are restricted to Liaison Officers for privacy protection. Tactical coordinates and movement directions are provided below for patrol coordination and dispatch response.
              </p>

              <dl className="details">
                <dt>Elephants Reported</dt>
                <dd>{selectedReport.numberOfElephants}</dd>
                <dt>Direction of Movement</dt>
                <dd>{selectedReport.directionOfMovement || 'Not specified'}</dd>
                {selectedReport.town && (
                  <>
                    <dt>Sector / Town</dt>
                    <dd>
                      {selectedReport.town}
                      {selectedReport.district ? ` · ${selectedReport.district}` : ''}
                    </dd>
                  </>
                )}
                <dt>Reported Time</dt>
                <dd>{formatDate(selectedReport.createdAt)}</dd>
              </dl>

              <div>
                <strong>Observer Description:</strong>
                <p>{selectedReport.description || 'No additional field remarks.'}</p>
              </div>

              {selectedReport.imageUrl && (
                <div>
                  <strong>Attached Photo:</strong>
                  <Photo path={selectedReport.imageUrl} />
                </div>
              )}

              {selectedReport.location && (
                <div>
                  <strong>Sighting Location:</strong>
                  <LocationMap location={selectedReport.location} />
                </div>
              )}

              {selectedReport.responses && selectedReport.responses.length > 0 && (
                <div>
                  <strong>Response Actions Logged:</strong>
                  <ol className="timeline" style={{ marginTop: '8px' }}>
                    {[...selectedReport.responses].reverse().map((resp) => (
                      <li key={resp._id || resp.respondedAt}>
                        <strong>{resp.action}</strong>
                        {resp.notes && <p>{resp.notes}</p>}
                        <small>
                          {resp.responder?.name || 'Staff'} · {formatDate(resp.respondedAt)}
                        </small>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setSelectedReport(null)}
                >
                  Close Sighting View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
export function CommunityReportDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const resource = useResource(`/community-reports/${id}`);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState('');
  const [notes, setNotes] = useState('');
  const report = resource.data;
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (report?.status) {
      setStatus(report.status);
    }
  }, [report?.status]);

  async function handleSaveStatus(e) {
    e.preventDefault();
    const targetStatus = status || report?.status;
    if (!targetStatus) return;
    setBusy(true);
    setError('');
    try {
      await api.patch(`/community-reports/${id}/status`, {
        status: targetStatus,
        ...(action ? { action, notes } : {}),
      });
      if (action) {
        await api.post(`/community-reports/${id}/response`, {
          action,
          notes,
          status: targetStatus,
        });
      }
      navigate('/app/community');
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  async function handleRecordResponse(e) {
    e.preventDefault();
    if (!action) {
      setError('Please choose a response action.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const targetStatus = status || report?.status;
      await api.post(`/community-reports/${id}/response`, {
        action,
        notes,
        ...(targetStatus ? { status: targetStatus } : {}),
      });
      if (targetStatus && targetStatus !== report?.status) {
        await api.patch(`/community-reports/${id}/status`, {
          status: targetStatus,
        });
      }
      navigate('/app/community');
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader title="Community report details">
        {report && (
          <button
            type="button"
            className="button secondary"
            onClick={() => exportSingleReportPDF(report)}
          >
            <FileDown size={16} /> Download Case PDF
          </button>
        )}
        <Link className="button secondary" to="/app/community">
          All reports
        </Link>
      </PageHeader>
      <Feedback error={error} />
      <ResourceState resource={resource}>
        {report && (
          <>
            <div className="detail-grid">
              <section className="panel">
                <div className="section-heading">
                  <h2>{report.landmark}</h2>
                  <CommunityStatusBadge status={report.status} />
                </div>
                <dl className="details">
                  <dt>Elephants</dt>
                  <dd>{report.numberOfElephants}</dd>
                  <dt>Movement</dt>
                  <dd>{report.directionOfMovement || 'Not supplied'}</dd>
                  {report.town && (
                    <>
                      <dt>Detected Town</dt>
                      <dd>
                        {report.town}
                        {report.district ? ` · ${report.district}` : ''}
                      </dd>
                    </>
                  )}
                  <dt>Reported</dt>
                  <dd>{formatDate(report.createdAt)}</dd>
                  <dt>Contact</dt>
                  <dd>{report.contact || 'Not supplied'}</dd>
                </dl>
                <p>{report.description || 'No additional description.'}</p>
                <Photo path={report.imageUrl} />
                <form className="inline-form" onSubmit={handleSaveStatus}>
                  <FormInput
                    name="status"
                    label="Report status"
                    value={status || report.status}
                    onChange={(e) => setStatus(e.target.value)}
                    options={statuses}
                  />
                  <button className="button" disabled={busy}>
                    Save status
                  </button>
                </form>
              </section>
              <LocationMap location={report.location} />
            </div>
            <div className="detail-grid section-gap">
              <form
                className="panel form-panel align-start"
                onSubmit={handleRecordResponse}
              >
                <h2>Record response action</h2>
                <FormInput
                  label="Response action"
                  required
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  options={[
                    '',
                    'Dispatch Ranger',
                    'Notify Nearby Community',
                    'Monitor Situation',
                    'No Action Required',
                    'Mark for Verification',
                  ]}
                />
                <FormInput
                  label="Response notes"
                  multiline
                  maxLength={2000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <p className="muted">
                  This logs your action. Dispatch and community notifications
                  must be coordinated separately.
                </p>
                <button className="button" disabled={busy}>
                  Record response
                </button>
              </form>
              <section className="panel">
                <h2>Response history</h2>
                {report.responses.length ? (
                  <ol className="timeline">
                    {[...report.responses].reverse().map((response) => (
                      <li key={response._id}>
                        <strong>{response.action}</strong>
                        <p>{response.notes}</p>
                        <small>
                          {response.responder?.name} ·{' '}
                          {formatDate(response.respondedAt)}
                        </small>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <EmptyState message="No response actions recorded yet." />
                )}
              </section>
            </div>
          </>
        )}
      </ResourceState>
    </>
  );
}
