import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
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
export default function IncidentManagement() {
  const resource = useResource('/incidents');
  const { user } = useAuth();
  const [filter, setFilter] = useState('All');
  const records =
    resource.data?.filter(
      (item) => filter === 'All' || item.status === filter,
    ) || [];
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
        <ResourceState resource={resource}>
          {records.length ? (
            <div className="record-list">
              {records.map((item) => (
                <Link
                  className="record"
                  key={item._id}
                  to={`/app/incidents/${item._id}`}
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
                    <StatusBadge status={item.syncStatus} />
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
            <LocationMap location={item.location} />
          </div>
        )}
      </ResourceState>
    </>
  );
}
