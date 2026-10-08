import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, multipart, errorMessage } from '../../services/api';
import {
  PageHeader,
  FormInput,
  LocationInput,
  PhotoUpload,
  Feedback,
} from '../../components/UI';
import { AlertTriangle, Eye, Minus, Plus, Trash2, WifiOff } from 'lucide-react';

export default function ReportElephantSighting() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType =
    searchParams.get('type') === 'crop-raiding'
      ? 'Crop-Raiding Incident'
      : 'Elephant Sighting';

  const [values, setValues] = useState({
    reportType: initialType,
    landmark: '',
    latitude: '',
    longitude: '',
    town: '',
    district: '',
    numberOfElephants: '1',
    directionOfMovement: '',
    description: '',
    contact: '',
    photo: null,
  });

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (values.photo) {
      const url = URL.createObjectURL(values.photo);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl('');
    }
  }, [values.photo]);

  const field = (name) => ({
    value: values[name],
    onChange: (e) => setValues((p) => ({ ...p, [name]: e.target.value })),
  });

  function adjustCount(delta) {
    const current = parseInt(values.numberOfElephants, 10) || 1;
    const updated = Math.max(1, current + delta);
    setValues((p) => ({ ...p, numberOfElephants: String(updated) }));
  }

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

    // PDF Exception Flow: Offline handling if device has no connection
    if (!navigator.onLine) {
      try {
        const queued = JSON.parse(
          localStorage.getItem('conservex_offline_sightings') || '[]',
        );
        const offlineId = `OFFLINE-${Date.now()}`;
        queued.push({
          ...values,
          _id: offlineId,
          photoName: values.photo?.name,
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem(
          'conservex_offline_sightings',
          JSON.stringify(queued),
        );
        navigate('/report/confirmation', {
          state: { id: offlineId, offline: true },
        });
        return;
      } catch (e) {
        // Fall through to standard submit
      }
    }

    try {
      const { data } = await api.post('/community-reports', multipart(values));
      window.dispatchEvent(new Event('new-community-report'));
      navigate('/report/confirmation', {
        state: {
          id: data.data._id,
          corroborated: data.data.corroborated,
          reportType: values.reportType,
        },
      });
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
        title={
          values.reportType === 'Crop-Raiding Incident'
            ? 'Report a crop-raiding incident'
            : 'Report an elephant sighting'
        }
        description="Help rangers and community liaison officers respond quickly. Fields marked * are required."
      />

      {isOffline && (
        <div className="notice warning">
          <WifiOff size={16} /> You are currently offline. Your report will be
          saved locally and queued for automatic transmission once connection returns.
        </div>
      )}

      <div className="notice">
        Stay at a safe distance. Do not approach elephants to take photographs.
      </div>

      <form className="panel form-panel" onSubmit={submit}>
        <Feedback error={error} />

        <div className="report-type-selector">
          <label className="field-label">Report Category</label>
          <div className="type-toggle-group">
            <button
              type="button"
              className={`toggle-option ${values.reportType === 'Elephant Sighting' ? 'active' : ''}`}
              onClick={() =>
                setValues((p) => ({ ...p, reportType: 'Elephant Sighting' }))
              }
            >
              <Eye size={16} /> Elephant Sighting
            </button>
            <button
              type="button"
              className={`toggle-option ${values.reportType === 'Crop-Raiding Incident' ? 'active' : ''}`}
              onClick={() =>
                setValues((p) => ({ ...p, reportType: 'Crop-Raiding Incident' }))
              }
            >
              <AlertTriangle size={16} /> Crop-Raiding Incident
            </button>
          </div>
        </div>

        <h2>Incident / Sighting details</h2>

        <FormInput
          label="Nearest location / landmark"
          required
          maxLength={200}
          placeholder="e.g. Palatupana village water tank, near boundary fence"
          {...field('landmark')}
        />

        <div className="form-grid">
          <div className="stepper-wrapper">
            <FormInput
              label="Number of elephants"
              type="number"
              min="1"
              max="1000"
              step="1"
              required
              {...field('numberOfElephants')}
            />
            <div className="stepper-quick-btns">
              <button
                type="button"
                className="button secondary stepper-mini-btn"
                aria-label="Decrease elephant count"
                onClick={() => adjustCount(-1)}
              >
                <Minus size={14} />
              </button>
              <button
                type="button"
                className="button secondary stepper-mini-btn"
                aria-label="Increase elephant count"
                onClick={() => adjustCount(1)}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <FormInput
            label="Direction of movement"
            placeholder="e.g. East, towards paddy fields"
            maxLength={120}
            {...field('directionOfMovement')}
          />
        </div>

        <LocationInput
          values={values}
          setValues={setValues}
          optional
          onApplyLandmark={(placeName) =>
            setValues((p) => ({ ...p, landmark: placeName }))
          }
        />

        <FormInput
          label="Description"
          multiline
          maxLength={2000}
          placeholder="Describe herd composition (calves, tuskers), observed behavior, crop damage, etc."
          {...field('description')}
        />

        <div className="photo-section">
          <PhotoUpload
            onChange={(photo) => setValues((p) => ({ ...p, photo }))}
          />
          {previewUrl && (
            <div className="photo-preview-card">
              <img
                src={previewUrl}
                alt="Selected sighting preview"
                className="preview-img"
              />
              <div className="preview-meta">
                <span>{values.photo?.name}</span>
                <small>
                  {(values.photo?.size / (1024 * 1024)).toFixed(2)} MB
                </small>
              </div>
              <button
                type="button"
                className="icon-button danger-btn"
                aria-label="Remove photo"
                onClick={() => setValues((p) => ({ ...p, photo: null }))}
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>

        <FormInput
          label="Phone / contact (optional)"
          type="tel"
          maxLength={120}
          placeholder="e.g. 077 123 4567"
          {...field('contact')}
        />
        <p className="muted">
          Your contact information is strictly confidential and used solely by liaison officers if follow-up is needed.
        </p>

        <button className="button" disabled={busy}>
          {busy ? 'Submitting…' : 'Submit sighting report'}
        </button>
      </form>
    </div>
  );
}
