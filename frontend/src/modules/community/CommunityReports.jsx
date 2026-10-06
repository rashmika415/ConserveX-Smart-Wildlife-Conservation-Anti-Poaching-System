import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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
const statuses = ['New', 'Reviewing', 'Responding', 'Resolved', 'False Report'];
export default function CommunityReports() {
  const resource = useResource('/community-reports');
  const [filter, setFilter] = useState('All');
  const records =
    resource.data?.filter(
      (item) => filter === 'All' || item.status === filter,
    ) || [];
  return (
    <>
      <PageHeader
        eyebrow="COMMUNITY RESPONSE"
        title="Community reports"
        description="Local observations. Coordinated conservation action."
      />
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
  const resource = useResource(`/community-reports/${id}`);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState('');
  const [notes, setNotes] = useState('');
  async function save(path, body, method = 'patch') {
    setBusy(true);
    setError('');
    try {
      const { data } = await api[method](
        `/community-reports/${id}/${path}`,
        body,
      );
      setSuccess(data.message);
      if (path === 'response') {
        setAction('');
        setNotes('');
      }
      resource.reload();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  const report = resource.data;
  return (
    <>
      <PageHeader title="Community report details">
        <Link className="button secondary" to="/app/community">
          All reports
        </Link>
      </PageHeader>
      <Feedback error={error} success={success} />
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
                  <dt>Reported</dt>
                  <dd>{formatDate(report.createdAt)}</dd>
                  <dt>Contact</dt>
                  <dd>{report.contact || 'Not supplied'}</dd>
                </dl>
                <p>{report.description || 'No additional description.'}</p>
                <Photo path={report.imageUrl} />
                <form
                  className="inline-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    save('status', {
                      status: new FormData(e.currentTarget).get('status'),
                    });
                  }}
                >
                  <FormInput
                    name="status"
                    label="Report status"
                    defaultValue={report.status}
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
                onSubmit={(e) => {
                  e.preventDefault();
                  save('response', { action, notes }, 'post');
                }}
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
