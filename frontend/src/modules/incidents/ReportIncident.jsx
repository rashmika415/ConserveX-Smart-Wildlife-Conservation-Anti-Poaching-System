import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, multipart, errorMessage } from '../../services/api';
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
  const [params] = useSearchParams();
  const [values, setValues] = useState({
    incidentType: '',
    latitude: '',
    longitude: '',
    description: '',
    photo: null,
    patrolId: params.get('patrol') || '',
  });
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(null);
  async function submit(event) {
    event.preventDefault();
    setError('');
    if (
      !values.incidentType ||
      values.latitude === '' ||
      values.longitude === ''
    ) {
      setError('Incident type, latitude and longitude are required.');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post(
        '/incidents',
        multipart({ ...values, syncStatus: offline ? 'Pending' : 'Synced' }),
      );
      setSaved(data.data);
    } catch (error) {
      setError(errorMessage(error));
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
          <h2>Incident reported successfully</h2>
          <p>Your report has been saved and is visible to the park manager.</p>
          <StatusBadge status={saved.syncStatus} />
          <p className="reference">Reference: {saved._id}</p>
          {saved.syncStatus === 'Pending' && (
            <p className="muted">
              Pending Sync is a demonstration label. This report is already
              saved in the database.
            </p>
          )}
          <Link className="button" to="/app/incidents">
            View incident history
          </Link>
        </section>
      ) : (
        <div className="detail-grid">
          <form className="panel form-panel" onSubmit={submit}>
            <Feedback error={error} />
            <h2>Incident details</h2>
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
              label="Description (optional)"
              multiline
              maxLength={2000}
              placeholder="What did you observe?"
              value={values.description}
              onChange={(e) =>
                setValues((p) => ({ ...p, description: e.target.value }))
              }
            />
            <PhotoUpload
              onChange={(photo) => setValues((p) => ({ ...p, photo }))}
            />
            <label className="checkbox">
              <input
                type="checkbox"
                checked={offline}
                onChange={(e) => setOffline(e.target.checked)}
              />{' '}
              Simulate Offline
            </label>
            <p className="muted">
              Simulation only: saves to the server with a{' '}
              {offline ? 'Pending Sync' : 'Synced'} label. A network connection
              is required.
            </p>
            <button className="button" disabled={busy}>
              {busy ? 'Saving report…' : 'Submit incident report'}
            </button>
          </form>
          <aside className="panel guidance">
            <h3>A useful field report</h3>
            <p>
              Confirm the location, choose the closest incident type, and add
              any observations that could help the response team.
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
