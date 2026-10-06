import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useResource } from '../../hooks/useResource';
import { api, multipart, errorMessage } from '../../services/api';
import {
  PageHeader,
  ResourceState,
  StatusBadge,
  formatDate,
  FormInput,
  Feedback,
  LocationInput,
  PhotoUpload,
  Photo,
  ConfirmDialog,
  LocationMap,
} from '../../components/UI';
export default function ActivePatrol() {
  const { id } = useParams();
  const { user } = useAuth();
  const resource = useResource(`/patrols/${id}`);
  const initial = {
    latitude: '',
    longitude: '',
    type: 'Checkpoint',
    description: '',
    photo: null,
  };
  const [values, setValues] = useState(initial);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [endStatus, setEndStatus] = useState('Completed');
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [formKey, setFormKey] = useState(0);
  async function action(path, body, method = 'patch') {
    setBusy(true);
    setError('');
    try {
      const { data } = await api[method](`/patrols/${id}/${path}`, body);
      setSuccess(data.message);
      resource.reload();
      setConfirm(false);
      if (path === 'waypoints') {
        setValues(initial);
        setFormKey((k) => k + 1);
      }
    } catch (error) {
      setError(errorMessage(error));
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }
  const patrol = resource.data;
  return (
    <>
      <PageHeader
        title={patrol?.routeName || 'Patrol details'}
        description={patrol?.parkName}
      >
        <Link className="button secondary" to="/app/patrols">
          All patrols
        </Link>
      </PageHeader>
      <Feedback error={error} success={success} />
      <ResourceState resource={resource}>
        {patrol && (
          <>
            <div className="detail-grid">
              <section className="panel">
                <div className="section-heading">
                  <h2>Patrol overview</h2>
                  <StatusBadge status={patrol.status} />
                </div>
                <dl className="details">
                  <dt>Ranger</dt>
                  <dd>{patrol.rangerId?.name}</dd>
                  <dt>Scheduled</dt>
                  <dd>{formatDate(patrol.scheduledDate)}</dd>
                  <dt>Started</dt>
                  <dd>{formatDate(patrol.startTime)}</dd>
                  <dt>Ended</dt>
                  <dd>{formatDate(patrol.endTime)}</dd>
                  {patrol.endTime && (
                    <>
                      <dt>Duration</dt>
                      <dd>{patrol.durationMinutes} minutes</dd>
                      <dt>Waypoints recorded</dt>
                      <dd>{patrol.waypoints.length}</dd>
                    </>
                  )}
                  {patrol.incompleteReason && (
                    <>
                      <dt>Ended early</dt>
                      <dd>{patrol.incompleteReason}</dd>
                    </>
                  )}
                </dl>
                {user.role === 'RANGER' && patrol.status === 'Assigned' && (
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => action('start')}
                  >
                    Start Patrol
                  </button>
                )}
                {user.role === 'RANGER' && patrol.status === 'Active' && (
                  <Link
                    className="button secondary"
                    to={`/app/incidents/new?patrol=${id}`}
                  >
                    Report incident on this patrol
                  </Link>
                )}
              </section>
              <section className="panel">
                <h2>Route checkpoints</h2>
                <ol className="checkpoint-list">
                  {patrol.checkpoints.map((point, index) => (
                    <li key={point._id || index}>
                      <strong>{point.name}</strong>
                      <span>
                        {point.location.latitude}, {point.location.longitude}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
            {user.role === 'RANGER' && patrol.status === 'Active' && (
              <div className="detail-grid section-gap">
                <form
                  className="panel form-panel"
                  key={formKey}
                  onSubmit={(event) => {
                    event.preventDefault();
                    action('waypoints', multipart(values), 'post');
                  }}
                >
                  <h2>Record waypoint</h2>
                  <FormInput
                    label="Waypoint type"
                    options={[
                      'Checkpoint',
                      'Wildlife',
                      'Hazard',
                      'Observation',
                    ]}
                    value={values.type}
                    onChange={(e) =>
                      setValues((p) => ({ ...p, type: e.target.value }))
                    }
                  />
                  <LocationInput values={values} setValues={setValues} />
                  <FormInput
                    label="Description (optional)"
                    multiline
                    maxLength={2000}
                    value={values.description}
                    onChange={(e) =>
                      setValues((p) => ({ ...p, description: e.target.value }))
                    }
                  />
                  <PhotoUpload
                    onChange={(photo) => setValues((p) => ({ ...p, photo }))}
                  />
                  <button className="button" disabled={busy}>
                    Save waypoint
                  </button>
                </form>
                <form
                  className="panel form-panel align-start"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setConfirm(true);
                  }}
                >
                  <h2>Finish this patrol</h2>
                  <p className="muted">
                    Ending a patrol saves its duration and final summary.
                  </p>
                  <FormInput
                    label="Outcome"
                    value={endStatus}
                    onChange={(e) => setEndStatus(e.target.value)}
                    options={['Completed', 'Incomplete']}
                  />
                  {endStatus === 'Incomplete' && (
                    <FormInput
                      label="Reason for ending early"
                      required
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      options={[
                        '',
                        'Weather',
                        'Injury',
                        'Hazard',
                        'Called Back',
                        'Other',
                      ]}
                    />
                  )}
                  <button className="button" disabled={busy}>
                    End Patrol
                  </button>
                </form>
              </div>
            )}
            <section className="panel section-gap">
              <h2>
                {patrol.endTime
                  ? 'Patrol summary · recorded waypoints'
                  : 'Waypoint activity'}
              </h2>
              {patrol.waypoints.length === 0 ? (
                <p className="muted">No waypoints recorded yet.</p>
              ) : (
                <div className="card-grid">
                  {patrol.waypoints.map((point) => (
                    <article className="waypoint" key={point._id}>
                      <div className="section-heading">
                        <strong>{point.type}</strong>
                        <small>{formatDate(point.recordedAt)}</small>
                      </div>
                      <p>{point.description || 'No note added.'}</p>
                      <LocationMap location={point.location} />
                      <Photo path={point.imageUrl} />
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </ResourceState>
      {confirm && (
        <ConfirmDialog
          title="End this patrol?"
          message={`The patrol will be marked ${endStatus.toLowerCase()}. You will no longer be able to add waypoints.`}
          busy={busy}
          onCancel={() => setConfirm(false)}
          onConfirm={() =>
            action('end', { status: endStatus, incompleteReason: reason })
          }
        />
      )}
    </>
  );
}
