import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, multipart, errorMessage } from '../../services/api';
import {
  PageHeader,
  FormInput,
  LocationInput,
  PhotoUpload,
  Feedback,
} from '../../components/UI';
export default function ReportElephantSighting() {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    landmark: '',
    latitude: '',
    longitude: '',
    numberOfElephants: '',
    directionOfMovement: '',
    description: '',
    contact: '',
    photo: null,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const field = (name) => ({
    value: values[name],
    onChange: (e) => setValues((p) => ({ ...p, [name]: e.target.value })),
  });
  async function submit(event) {
    event.preventDefault();
    setError('');
    if (
      !values.landmark.trim() ||
      !Number.isInteger(Number(values.numberOfElephants)) ||
      Number(values.numberOfElephants) < 1
    ) {
      setError('Enter a landmark and a positive whole number of elephants.');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post('/community-reports', multipart(values));
      navigate('/report/confirmation', { state: { id: data.data._id } });
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="public-form">
      <PageHeader
        eyebrow="COMMUNITY REPORTING"
        title="Report an elephant sighting"
        description="Help the team understand where elephants are moving. Fields marked * are required."
      />
      <div className="notice">
        Stay at a safe distance. This demo form does not dispatch emergency
        assistance.
      </div>
      <form className="panel form-panel" onSubmit={submit}>
        <Feedback error={error} />
        <h2>Sighting details</h2>
        <FormInput
          label="Nearest location / landmark"
          required
          maxLength={200}
          placeholder="e.g. Palatupana village water tank"
          {...field('landmark')}
        />
        <div className="form-grid">
          <FormInput
            label="Number of elephants"
            type="number"
            min="1"
            max="1000"
            step="1"
            required
            {...field('numberOfElephants')}
          />
          <FormInput
            label="Direction of movement"
            placeholder="e.g. East, towards the park"
            maxLength={120}
            {...field('directionOfMovement')}
          />
        </div>
        <LocationInput values={values} setValues={setValues} optional />
        <FormInput
          label="Description"
          multiline
          maxLength={2000}
          {...field('description')}
        />
        <PhotoUpload
          onChange={(photo) => setValues((p) => ({ ...p, photo }))}
        />
        <FormInput
          label="Phone / contact (optional)"
          type="tel"
          maxLength={120}
          {...field('contact')}
        />
        <p className="muted">
          Your contact is visible only to authorized staff reviewing this
          report.
        </p>
        <button className="button" disabled={busy}>
          {busy ? 'Submitting…' : 'Submit sighting report'}
        </button>
      </form>
    </div>
  );
}
