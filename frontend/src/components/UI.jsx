import { useId, useState } from 'react';
import {
  MapPin,
  LocateFixed,
  LoaderCircle,
  Inbox,
  ArrowUpRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { photoUrl } from '../services/api';
export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';
export const roleLabel = {
  MANAGER: 'Park Manager',
  RANGER: 'Ranger',
  LIAISON: 'Community Liaison Officer',
};
export function PageHeader({
  eyebrow = 'CONSERVATION OPERATIONS',
  title,
  description,
  children,
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function StatusBadge({ status }) {
  return (
    <span
      className={`badge badge-${String(status).toLowerCase().replaceAll(' ', '-')}`}
    >
      {status === 'Pending' ? 'Pending Sync' : status}
    </span>
  );
}
export function LoadingSpinner() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={22} /> Loading conservation data…
    </div>
  );
}
export function EmptyState({
  message = 'No records yet. New activity will appear here.',
}) {
  return (
    <div className="empty">
      <Inbox size={30} />
      <p>{message}</p>
    </div>
  );
}
export function Feedback({ error, success }) {
  return (
    <>
      {error && (
        <div className="feedback error" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="feedback success" role="status">
          {success}
        </div>
      )}
    </>
  );
}
export function ResourceState({ resource, children }) {
  if (resource.error)
    return (
      <div>
        <Feedback error={resource.error} />
        <button className="button secondary" onClick={resource.reload}>
          Try again
        </button>
      </div>
    );
  if (resource.loading) return <LoadingSpinner />;
  return children;
}
export function FormInput({ label, error, options, multiline, ...props }) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>
        {label}
        {props.required && <span className="required"> *</span>}
      </span>
      {options ? (
        <select id={id} {...props}>
          {options.map((option) =>
            typeof option === 'string' ? (
              <option key={option} value={option}>
                {option || 'Select…'}
              </option>
            ) : (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ),
          )}
        </select>
      ) : multiline ? (
        <textarea id={id} rows={4} {...props} />
      ) : (
        <input id={id} {...props} />
      )}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}
export function PhotoUpload({ onChange }) {
  const [error, setError] = useState('');
  return (
    <FormInput
      label="Photograph (optional)"
      type="file"
      accept="image/png,image/jpeg,image/webp"
      error={error}
      onChange={(event) => {
        const file = event.target.files[0];
        if (
          file &&
          (file.size > 5 * 1024 * 1024 ||
            !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
        ) {
          setError('Choose a PNG, JPEG or WebP image under 5 MB.');
          event.target.value = '';
          onChange(null);
        } else {
          setError('');
          onChange(file || null);
        }
      }}
    />
  );
}
export function LocationInput({ values, setValues, optional = false }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  function locate() {
    if (!navigator.geolocation) {
      setError('GPS is unavailable. Enter coordinates manually.');
      return;
    }
    setBusy(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValues((previous) => ({
          ...previous,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setBusy(false);
      },
      () => {
        setError('Could not get GPS location. Enter coordinates manually.');
        setBusy(false);
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  }
  return (
    <fieldset className="location-input">
      <legend>Location {optional ? '(optional)' : ''}</legend>
      <div className="form-grid">
        <FormInput
          label="Latitude"
          type="number"
          step="any"
          min="-90"
          max="90"
          required={!optional || !!values.longitude}
          value={values.latitude}
          onChange={(e) =>
            setValues((p) => ({ ...p, latitude: e.target.value }))
          }
        />
        <FormInput
          label="Longitude"
          type="number"
          step="any"
          min="-180"
          max="180"
          required={!optional || !!values.latitude}
          value={values.longitude}
          onChange={(e) =>
            setValues((p) => ({ ...p, longitude: e.target.value }))
          }
        />
      </div>
      <button
        type="button"
        className="text-button"
        disabled={busy}
        onClick={locate}
      >
        <LocateFixed size={16} />
        {busy ? 'Locating…' : 'Use my current location'}
      </button>
      {error && <small role="alert">{error}</small>}
    </fieldset>
  );
}
export function LocationMap({ location, zone }) {
  if (!location)
    return (
      <div className="map-empty">
        Coordinates were not supplied. Refer to the landmark.
      </div>
    );
  return (
    <div className="location-map">
      <div className="map-grid" />
      {zone && <div className="risk-ring" />}
      <div className="map-marker">
        <MapPin size={30} fill="currentColor" />
        <span>Reported location</span>
      </div>
      <div className="map-caption">
        <strong>
          {Number(location.latitude).toFixed(5)},{' '}
          {Number(location.longitude).toFixed(5)}
        </strong>
        <span>
          {zone
            ? `${zone.zoneName} · radius ${zone.radius} m`
            : 'Location reference'}{' '}
          · schematic, not to scale
        </span>
      </div>
    </div>
  );
}
export function Photo({ path }) {
  return (
    path && (
      <a href={photoUrl(path)} target="_blank" rel="noreferrer">
        <img
          className="report-photo"
          src={photoUrl(path)}
          alt="Submitted field photograph"
        />
      </a>
    )
  );
}
export function DashboardCard({
  label,
  value,
  icon: Icon,
  tone = 'green',
  to,
}) {
  return (
    <Link to={to} className={`stat-card ${tone}`}>
      <div className="stat-top">
        <span>{label}</span>
        <Icon size={20} />
      </div>
      <strong>{value}</strong>
      <span className="stat-foot">
        View records <ArrowUpRight size={16} />
      </span>
    </Link>
  );
}
export function ConfirmDialog({ title, message, onConfirm, onCancel, busy }) {
  const id = useId();
  return (
    <div className="modal-backdrop">
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !busy) onCancel();
        }}
      >
        <h2 id={id}>{title}</h2>
        <p>{message}</p>
        <div className="button-row">
          <button
            autoFocus
            className="button secondary"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="button" onClick={onConfirm} disabled={busy}>
            {busy ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
