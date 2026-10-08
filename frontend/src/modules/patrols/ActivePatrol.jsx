import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOfflinePatrol } from '../../hooks/useOfflinePatrol';
import {
  saveWaypoint,
  syncWaypoints,
  listWaypoints,
} from '../../services/offlineWaypoints';
import { api, errorMessage } from '../../services/api';
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
  const resource = useOfflinePatrol(id, user._id);
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
  const [endOptionsOpen, setEndOptionsOpen] = useState(false);
  const [endStatus, setEndStatus] = useState('Completed');
  const [reason, setReason] = useState('');
  const [reasonDetails, setReasonDetails] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [formKey, setFormKey] = useState(0);
  async function action(path, body, method = 'patch') {
    setBusy(true);
    setError('');
    try {
      if (path === 'end') {
        await syncWaypoints(user._id);
        if (
          (await listWaypoints(user._id, id)).some(
            (point) => point.syncStatus === 'PENDING',
          )
        )
          throw new Error(
            'Sync all pending waypoints before ending this patrol.',
          );
      }
      const { data } = await api[method](`/patrols/${id}/${path}`, body);
      setSuccess(data.message);
      resource.reload();
      setConfirm(false);
      if (path === 'waypoints') {
        setValues(initial);
        setFormKey((k) => k + 1);
      }
    } catch (error) {
      setError(error.message || errorMessage(error));
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }
  async function recordWaypoint() {
    setBusy(true);
    setError('');
    try {
      await saveWaypoint(user._id, id, values);
      setValues(initial);
      setFormKey((key) => key + 1);
      setSuccess(
        'Waypoint saved locally. Pending waypoints upload automatically when connected.',
      );
      await syncWaypoints(user._id);
    } catch (error) {
      setError(
        error.message ||
          'Could not save locally. Keep this form open and try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  const patrol = resource.data;
  const pending = resource.points.filter(
    (point) => point.syncStatus === 'PENDING',
  );
  const waypoints = [
    ...(patrol?.waypoints || []),
    ...resource.points
      .filter(
        (point) =>
          point.syncStatus === 'PENDING' ||
          !(patrol?.waypoints || []).some(
            (saved) => saved.clientId === point.clientId,
          ),
      )
      .map((point) => ({
        ...point,
        _id: point.clientId,
        location: { latitude: point.latitude, longitude: point.longitude },
      })),
  ];
  return (
    <div className="patrol-workspace">
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
                  <dt>Scheduled end</dt>
                  <dd>{formatDate(patrol.scheduledEndTime)}</dd>
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
              <div className="patrol-side-panels">
                {patrol.status === 'Incomplete' && (
                  <section
                    className="panel patrol-termination-panel"
                    aria-labelledby="early-termination-heading"
                  >
                    <span className="patrol-termination-label">
                      Patrol ended early
                    </span>
                    <h2 id="early-termination-heading">Early termination</h2>
                    <dl className="details">
                      <dt>Reason</dt>
                      <dd>{patrol.incompleteReason || 'No reason recorded'}</dd>
                      {patrol.incompleteReason === 'Other' &&
                        patrol.incompleteReasonDetails && (
                          <>
                            <dt>Explanation</dt>
                            <dd>{patrol.incompleteReasonDetails}</dd>
                          </>
                        )}
                      <dt>Ended</dt>
                      <dd>{formatDate(patrol.endTime)}</dd>
                    </dl>
                  </section>
                )}
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
            </div>
            {user.role === 'RANGER' && patrol.status === 'Active' && (
              <div className="detail-grid section-gap">
                <form
                  className="panel form-panel"
                  key={formKey}
                  onSubmit={(event) => {
                    event.preventDefault();
                    recordWaypoint();
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
                    if (endStatus === 'Incomplete') {
                      const form = event.currentTarget;
                      const reasonField =
                        form.elements.namedItem('incompleteReason');
                      const detailsField = form.elements.namedItem(
                        'incompleteReasonDetails',
                      );
                      reasonField.setCustomValidity(
                        reason
                          ? ''
                          : 'Please fill this field: select a reason for ending early.',
                      );
                      if (detailsField) {
                        detailsField.setCustomValidity(
                          reasonDetails.trim()
                            ? ''
                            : 'Please fill this field: describe the reason for ending early.',
                        );
                      }
                      if (!form.reportValidity()) return;
                    }
                    setError('');
                    setConfirm(true);
                  }}
                >
                  <h2>Finish this patrol</h2>
                  <p className="muted">
                    Ending a patrol saves its duration and final summary.
                  </p>
                  <button
                    type="button"
                    className="button"
                    disabled={busy}
                    aria-expanded={endOptionsOpen}
                    aria-controls="patrol-end-options"
                    onClick={() => {
                      setEndOptionsOpen((open) => !open);
                      setEndStatus('Completed');
                      setReason('');
                    }}
                  >
                    End Patrol
                  </button>
                  {endOptionsOpen && (
                    <div id="patrol-end-options" className="button-row">
                      <button
                        type="button"
                        className="button"
                        disabled={busy}
                        onClick={() => {
                          setEndStatus('Completed');
                          setReason('');
                          setConfirm(true);
                        }}
                      >
                        Complete Patrol
                      </button>
                      <button
                        type="button"
                        className="button secondary"
                        disabled={busy}
                        onClick={() => setEndStatus('Incomplete')}
                      >
                        Terminate Early
                      </button>
                    </div>
                  )}
                  {endOptionsOpen && endStatus === 'Incomplete' && (
                    <>
                      <FormInput
                        label="Reason for ending early"
                        required
                        name="incompleteReason"
                        value={reason}
                        onInvalid={(e) =>
                          e.target.setCustomValidity(
                            'Please fill this field: select a reason for ending early.',
                          )
                        }
                        onChange={(e) => {
                          e.target.setCustomValidity('');
                          setReason(e.target.value);
                        }}
                        options={[
                          '',
                          'Medical Emergency',
                          'Vehicle Breakdown',
                          'Severe Weather',
                          'Unsafe Conditions',
                          'Blocked or Inaccessible Route',
                          'Wildlife Threat',
                          'Equipment Failure',
                          'Communication Failure',
                          'Emergency Reassignment',
                          'Security Threat',
                          'Insufficient Resources',
                          'Other',
                        ]}
                      />
                      {reason === 'Other' && (
                        <FormInput
                          label="Describe the reason for ending early"
                          multiline
                          required
                          maxLength={2000}
                          name="incompleteReasonDetails"
                          value={reasonDetails}
                          onInvalid={(e) =>
                            e.target.setCustomValidity(
                              'Please fill this field: describe the reason for ending early.',
                            )
                          }
                          onChange={(e) => {
                            e.target.setCustomValidity(
                              e.target.value.trim()
                                ? ''
                                : 'Please fill this field: describe the reason for ending early.',
                            );
                            setReasonDetails(e.target.value);
                          }}
                        />
                      )}
                      <button className="button" disabled={busy}>
                        Confirm early termination
                      </button>
                    </>
                  )}
                </form>
              </div>
            )}
            <section className="panel section-gap patrol-summary">
              <p role="status" className="patrol-sync-status">
                {pending.length
                  ? `${pending.length} waypoint(s) PENDING sync`
                  : 'All waypoints SYNCED'}
              </p>
              {pending.length > 0 && (
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() =>
                    syncWaypoints(user._id).catch((error) =>
                      setError(error.message),
                    )
                  }
                >
                  Retry sync
                </button>
              )}
              <h2>
                {patrol.endTime
                  ? 'Patrol summary · recorded waypoints'
                  : 'Waypoint activity'}
              </h2>
              {waypoints.length === 0 ? (
                <p className="muted">No waypoints recorded yet.</p>
              ) : (
                <div className="card-grid patrol-waypoint-grid">
                  {waypoints.map((point) => (
                    <article className="waypoint" key={point._id}>
                      <div className="section-heading">
                        <strong>
                          {point.type}{' '}
                          <span className="badge">
                            {point.syncStatus || 'SYNCED'}
                          </span>
                        </strong>
                        <small>{formatDate(point.recordedAt)}</small>
                      </div>
                      <p>{point.description || 'No note added.'}</p>
                      {point.syncError && <p role="alert">{point.syncError}</p>}
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
            action('end', {
              status: endStatus,
              incompleteReason: reason,
              ...(endStatus === 'Incomplete' && reason === 'Other'
                ? { incompleteReasonDetails: reasonDetails.trim() }
                : {}),
            })
          }
        />
      )}
    </div>
  );
}
