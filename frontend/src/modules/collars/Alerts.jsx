import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bell } from 'lucide-react';
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
  ConfirmDialog,
} from '../../components/UI';
export default function Alerts() {
  const resource = useResource('/alerts', true);
  const [filter, setFilter] = useState('Open');
  const records =
    resource.data?.filter(
      (item) =>
        filter === 'All' ||
        (filter === 'Open'
          ? item.status !== 'Resolved'
          : item.status === filter),
    ) || [];
  return (
    <>
      <PageHeader
        eyebrow="WILDLIFE RESPONSE"
        title="High-risk alerts"
        description="Monitor risk-zone entries and coordinate a timely response."
      />
      <section className="panel">
        <div className="section-heading">
          <h2>Alert centre</h2>
          <FormInput
            label="Filter alerts"
            options={['Open', 'All', 'New', 'Acknowledged', 'Resolved']}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <ResourceState resource={resource}>
          {records.length ? (
            <div className="record-list">
              {records.map((alert) => (
                <Link
                  key={alert._id}
                  to={`/app/alerts/${alert._id}`}
                  className="record"
                >
                  <span className="record-icon amber">
                    <Bell size={20} />
                  </span>
                  <div className="record-main">
                    <strong>
                      {alert.animalId?.tagName} · {alert.zoneId?.zoneName}
                    </strong>
                    <span>{alert.message}</span>
                    <small>
                      Last detected{' '}
                      {formatDate(alert.lastDetectedAt || alert.createdAt)}
                    </small>
                  </div>
                  <div className="record-badges">
                    <StatusBadge status={alert.priority} />
                    <StatusBadge status={alert.status} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState message="No alerts match this view." />
          )}
        </ResourceState>
        <p className="muted">
          Refreshes every 30 seconds. Repeated readings update the same
          unresolved alert.
        </p>
      </section>
    </>
  );
}
export function AlertDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const resource = useResource(`/alerts/${id}`);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  async function act(action) {
    setError('');
    setBusy(true);
    try {
      const { data } = await api.patch(`/alerts/${id}/${action}`);
      setSuccess(data.message);
      resource.reload();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }
  const alert = resource.data;
  return (
    <>
      <PageHeader title="Alert details">
        <Link className="button secondary" to="/app/alerts">
          All alerts
        </Link>
      </PageHeader>
      <Feedback error={error} success={success} />
      <ResourceState resource={resource}>
        {alert && (
          <div className="detail-grid">
            <section className="panel">
              <div className="section-heading">
                <StatusBadge status={alert.priority} />
                <StatusBadge status={alert.status} />
              </div>
              <h2>{alert.animalId?.tagName}</h2>
              <p>{alert.message}</p>
              <dl className="details">
                <dt>GPS collar</dt>
                <dd>{alert.collarId}</dd>
                <dt>Risk zone</dt>
                <dd>{alert.zoneId?.zoneName}</dd>
                <dt>First detected</dt>
                <dd>{formatDate(alert.createdAt)}</dd>
                <dt>Last detected</dt>
                <dd>{formatDate(alert.lastDetectedAt)}</dd>
                <dt>Acknowledged by</dt>
                <dd>{alert.acknowledgedBy?.name || 'Awaiting response'}</dd>
                <dt>Acknowledged at</dt>
                <dd>{formatDate(alert.acknowledgedAt)}</dd>
                {alert.resolvedAt && (
                  <>
                    <dt>Resolved by</dt>
                    <dd>{alert.resolvedBy?.name}</dd>
                    <dt>Resolved at</dt>
                    <dd>{formatDate(alert.resolvedAt)}</dd>
                  </>
                )}
              </dl>
              {user.role !== 'MANAGER' && alert.status === 'New' && (
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => act('acknowledge')}
                >
                  Acknowledge alert
                </button>
              )}
              {user.role === 'MANAGER' && alert.status !== 'Resolved' && (
                <button className="button" onClick={() => setConfirm(true)}>
                  Resolve alert
                </button>
              )}
            </section>
            <LocationMap location={alert} zone={alert.zoneId} />
          </div>
        )}
      </ResourceState>
      {confirm && (
        <ConfirmDialog
          title="Resolve this alert?"
          message="A future risk-zone reading can create a new alert for this animal."
          busy={busy}
          onCancel={() => setConfirm(false)}
          onConfirm={() => act('resolve')}
        />
      )}
    </>
  );
}
