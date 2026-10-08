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
import { FileDown, Download } from 'lucide-react';
import {
  exportAllReportsPDF,
  exportAllReportsCSV,
  exportSingleReportPDF,
} from '../../services/pdfExport';
const statuses = ['New', 'Reviewing', 'Responding', 'Resolved', 'False Report'];
export default function CommunityReports() {
  const resource = useResource('/community-reports');
  const [filter, setFilter] = useState('All');
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
              {records.map((item) => (
                <Link
                  className="record"
                  key={item._id}
                  to={`/app/community/${item._id}`}
                >
                  <span className="record-icon">{item.numberOfElephants}</span>
                  <div className="record-main">
                    <strong>{item.landmark}</strong>
                    <span>
                      {item.numberOfElephants} elephant
                      {item.numberOfElephants > 1 ? 's' : ''} ·{' '}
                      {item.directionOfMovement || 'Direction not provided'}
                    </span>
                    <small>
                      {formatDate(item.createdAt)} · {item.responses.length}{' '}
                      response actions
                    </small>
                  </div>
                  <StatusBadge status={item.status} />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState message="No community reports match this view." />
          )}
        </ResourceState>
      </section>
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
                  <StatusBadge status={report.status} />
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
