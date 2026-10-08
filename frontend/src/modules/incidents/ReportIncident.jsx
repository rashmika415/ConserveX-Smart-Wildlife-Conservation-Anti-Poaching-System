import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, multipart, errorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { saveOfflineIncident } from '../../services/incidentOutbox';
import { useIncidentOutbox } from '../../hooks/useIncidentOutbox';
import {
  PageHeader,
  FormInput,
  LocationInput,
  PhotoUpload,
  Feedback,
  StatusBadge,
} from '../../components/UI';

export const incidentTypes = [
  'Snare / Trap',
  'Animal Carcass',
  'Illegal Campsite',
  'Suspected Poaching',
  'Injured Animal',
  'Other',
];

export default function ReportIncident() {
  const { user } = useAuth();
  useIncidentOutbox(user?._id);
  const [params] = useSearchParams();
  const [values, setValues] = useState({
    incidentType: '',
    latitude: '',
    longitude: '',
    description: '',
    photo: null,
    patrolId: params.get('patrol') || '',
  });
  const [online, setOnline] = useState(navigator.onLine);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  async function saveLocally() {
    setSaved(await saveOfflineIncident(values, user?._id));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (
      !values.incidentType ||
      values.latitude === '' ||
      values.longitude === '' ||
      !values.description.trim()
    ) {
      setError(
        'Incident type, latitude, longitude and a short description are required.',
      );
      return;
    }
    setBusy(true);
    if (!online) {
      try {
        await saveLocally();
      } catch {
        setError(
          'This device could not save the report offline. Free some storage and try again.',
        );
      } finally {
        setBusy(false);
      }
      return;
    }
    try {
      const { data } = await api.post('/incidents', multipart(values));
      setSaved({ ...data.data, syncState: 'SYNCED' });
    } catch (requestError) {
      if (!requestError.response) {
        try {
          await saveLocally();
        } catch {
          setError(errorMessage(requestError));
        }
      } else setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="INCIDENT MANAGEMENT"
        title="Report an incident"
        description="Record field observations and help the team respond."
      />
      {saved ? (
        <section className="panel confirmation">
          <h2>
            {saved.syncState === 'SYNCED'
              ? 'Incident synchronized successfully'
              : 'Incident saved on this device'}
          </h2>
          <StatusBadge status={saved.syncState} />
          <p className="reference">Reference: {saved._id || saved.localId}</p>
          {saved.syncState !== 'SYNCED' && (
            <p className="muted">
              This report is saved locally, but the park manager cannot see it
              yet. It will retry automatically when connectivity returns.
            </p>
          )}
          <Link className="button" to="/app/incidents">
            View my incident history
          </Link>
        </section>
      ) : (
        <div className="detail-grid">
          <form className="panel form-panel" onSubmit={submit}>
            <Feedback error={error} />
            <div className="section-heading">
              <h2>Incident details</h2>
              <StatusBadge status="DRAFT" />
            </div>
            <div
              className={`connectivity ${online ? 'online' : 'offline'}`}
              role="status"
            >
              {online
                ? 'Online — reports will synchronize immediately.'
                : 'Offline — reports will be saved only on this device.'}
            </div>
            <FormInput
              label="Incident type"
              options={['', ...incidentTypes]}
              required
              value={values.incidentType}
              onChange={(e) =>
                setValues((p) => ({ ...p, incidentType: e.target.value }))
              }
            />
            <LocationInput values={values} setValues={setValues} />
            <FormInput
              label="Short description"
              multiline
              required
              maxLength={500}
              placeholder="What did you observe?"
              value={values.description}
              onChange={(e) =>
                setValues((p) => ({ ...p, description: e.target.value }))
              }
            />
            <PhotoUpload
              onChange={(photo) => setValues((p) => ({ ...p, photo }))}
            />
            <button className="button" disabled={busy}>
              {busy
                ? 'Saving report…'
                : online
                  ? 'Submit and synchronize report'
                  : 'Save report on this device'}
            </button>
          </form>
          <aside className="panel guidance">
            <h3>A useful field report</h3>
            <p>
              Confirm the location, choose the closest incident type, and add
              observations that could help the response team.
            </p>
            <p>
              Photographs are optional. Accepted formats: JPEG, PNG and WebP, up
              to 5 MB.
            </p>
            {values.patrolId && (
              <div className="notice">
                This incident will be linked to your active patrol.
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
