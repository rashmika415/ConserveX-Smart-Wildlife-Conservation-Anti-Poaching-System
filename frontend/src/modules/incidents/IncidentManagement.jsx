import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useResource } from '../../hooks/useResource';
import { api, errorMessage } from '../../services/api';
import { useIncidentOutbox } from '../../hooks/useIncidentOutbox';
import {
  PageHeader,
  ResourceState,
  EmptyState,
  StatusBadge,
  formatDate,
  FormInput,
  Feedback,
  LeafletLocationMap,
  Photo,
} from '../../components/UI';
export default function IncidentManagement() {
  const resource = useResource('/incidents');
  const { user } = useAuth();
  const outbox = useIncidentOutbox(user.role === 'RANGER' ? user._id : null);
  const [filter, setFilter] = useState('All');
  const localRecords = outbox.records.map((item) => ({
    ...item,
    _id: item.localId,
    localOnly: true,
    rangerId: { name: user.name },
    status: 'Reported',
  }));
  const records = [...localRecords, ...(resource.data || [])]
    .filter((item) => filter === 'All' || item.status === filter)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const visibleResource = records.length
    ? { ...resource, loading: false, error: '' }
    : resource;
  useEffect(() => {
    const reload = () => resource.reload();
    window.addEventListener('incident-synced', reload);
    return () => window.removeEventListener('incident-synced', reload);
  }, [resource.reload]);
  return (
    <>
      <PageHeader
        title={
          user.role === 'RANGER' ? 'Incident history' : 'Incident management'
        }
        description="Field observations, connected to the people who can act."
      >
        {user.role === 'RANGER' && (
          <Link className="button" to="/app/incidents/new">
            + Report incident
          </Link>
        )}
      </PageHeader>
      <section className="panel">
        <div className="section-heading">
          <h2>Incident reports</h2>
          <FormInput
            label="Filter by status"
            options={['All', 'Reported', 'Under Review', 'Resolved']}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        {user.role === 'RANGER' && outbox.records.length > 0 && (
          <div className="notice sync-notice">
            <span>
              {outbox.records.length} report
              {outbox.records.length === 1 ? '' : 's'} saved on this device and
              not yet confirmed by the server.
            </span>
            <button
              className="button secondary"
              disabled={outbox.syncing || !navigator.onLine}
              onClick={outbox.sync}
            >
              {outbox.syncing ? 'Synchronizing…' : 'Retry sync'}
            </button>
          </div>
        )}
        <Feedback error={outbox.storageError} />
        <ResourceState resource={visibleResource}>
          {records.length ? (
            <div className="record-list">
              {records.map((item) => (
                <Link
                  className="record"
                  key={item._id}
                  to={
                    item.localOnly
                      ? '/app/incidents'
                      : `/app/incidents/${item._id}`
                  }
                  aria-label={
                    item.localOnly
                      ? `${item.incidentType}, saved locally`
                      : undefined
                  }
                >
                  <div className="record-icon">!</div>
                  <div className="record-main">
                    <strong>{item.incidentType}</strong>
                    <span>{item.description || 'No description provided'}</span>
                    <small>
                      {item.rangerId?.name} · {formatDate(item.createdAt)}
                    </small>
                  </div>
                  <div className="record-badges">
                    <StatusBadge status={item.status} />
                    <StatusBadge status={item.syncState || 'SYNCED'} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState message="No incidents match this view." />
          )}
        </ResourceState>
      </section>
    </>
  );
}
export function IncidentDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const resource = useResource(`/incidents/${id}`);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  async function change(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.patch(`/incidents/${id}/status`, {
        status: new FormData(event.currentTarget).get('status'),
      });
      setSuccess('Incident status updated.');
      resource.reload();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  const item = resource.data;
  return (
    <>
      <PageHeader title="Incident details">
        <Link className="button secondary" to="/app/incidents">
          Back to incidents
        </Link>
      </PageHeader>
      <Feedback error={error} success={success} />
      <ResourceState resource={resource}>
        {item && (
          <div className="detail-grid">
            <section className="panel">
              <div className="section-heading">
                <h2>{item.incidentType}</h2>
                <StatusBadge status={item.status} />
              </div>
              <p>{item.description || 'No description provided.'}</p>
              <dl className="details">
                <dt>Reported by</dt>
                <dd>{item.rangerId?.name}</dd>
                <dt>Reported at</dt>
                <dd>{formatDate(item.createdAt)}</dd>
                <dt>Synchronization</dt>
                <dd>
                  <StatusBadge status={item.syncStatus} />
                </dd>
              </dl>
              <Photo path={item.imageUrl} />
              {user.role === 'MANAGER' && (
                <form onSubmit={change} className="inline-form">
                  <FormInput
                    name="status"
                    label="Incident status"
                    defaultValue={item.status}
                    options={['Reported', 'Under Review', 'Resolved']}
                  />
                  <button className="button" disabled={busy}>
                    Save status
                  </button>
                </form>
              )}
            </section>
            <LeafletLocationMap
              location={item.location}
              className="incident-detail-map"
            />
          </div>
        )}
      </ResourceState>
    </>
  );
}
