import { useEffect, useId, useRef, useState } from 'react';
import {
  MapPin,
  LocateFixed,
  Compass,
  LoaderCircle,
  Inbox,
  ArrowUpRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { photoUrl } from '../services/api';
import { reverseGeocodeGeoapify } from '../services/geocode';
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
  const labels = {
    DRAFT: 'Draft',
    SAVED_OFFLINE: 'Saved locally',
    PENDING_SYNC: 'Pending sync',
    SYNCED: 'Synced',
  };
  return (
    <span
      className={`badge badge-${String(status).toLowerCase().replaceAll(' ', '-')}`}
    >
      {labels[status] ||
        (status === 'Pending'
          ? 'Pending Sync'
          : status === 'Incomplete'
            ? 'Terminated'
            : status)}
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
export function LocationInput({
  values,
  setValues,
  optional = false,
  onApplyLandmark,
}) {
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [detectedPlace, setDetectedPlace] = useState(null);
  const [detectingPlace, setDetectingPlace] = useState(false);

  const identifyPlace = async (lat, lon) => {
    if (!lat || !lon) return;
    setDetectingPlace(true);
    const place = await reverseGeocodeGeoapify(lat, lon);
    setDetectingPlace(false);
    if (place) {
      setDetectedPlace(place);
      setValues((prev) => ({
        ...prev,
        town: place.town || '',
        district: place.district || '',
      }));
      if (onApplyLandmark && !values.landmark) {
        onApplyLandmark(place.areaTitle || place.town || place.formatted);
      }
    }
  };

  function updateCoords(newLat, newLng, feedback) {
    setValues((previous) => ({
      ...previous,
      latitude: newLat,
      longitude: newLng,
    }));
    if (feedback) setSuccessMsg(feedback);
    setError('');
    setShowMap(true);
    identifyPlace(newLat, newLng);
  }

  function locate() {
    if (!navigator.geolocation) {
      setError('GPS is unavailable. Enter coordinates manually.');
      return;
    }
    setBusy(true);
    setError('');
    setSuccessMsg('');

    const tryPosition = (highAccuracy = false) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(6);
          const lng = position.coords.longitude.toFixed(6);
          updateCoords(
            lat,
            lng,
            '✓ Current coordinates captured from your device.',
          );
          setBusy(false);
        },
        (geoError) => {
          if (!highAccuracy) {
            tryPosition(true);
            return;
          }
          let msg = 'Could not get GPS location. Enter coordinates manually.';
          if (geoError?.code === 1) {
            msg =
              'Location permission was denied in your browser. Enter coordinates manually or select a preset location below.';
          } else if (geoError?.code === 2) {
            msg =
              'GPS signal unavailable on this device. Enter coordinates manually or select a preset location below.';
          } else if (geoError?.code === 3) {
            msg =
              'GPS request timed out. Enter coordinates manually or select a preset location below.';
          }
          setError(msg);
          setBusy(false);
        },
        {
          timeout: highAccuracy ? 8000 : 5000,
          enableHighAccuracy: highAccuracy,
          maximumAge: 300000,
        },
      );
    };

    tryPosition(false);
  }

  const hasCoords = !!values.latitude && !!values.longitude;

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
          onChange={(e) => {
            const val = e.target.value;
            setValues((p) => ({ ...p, latitude: val }));
            if (val && values.longitude) identifyPlace(val, values.longitude);
          }}
        />
        <FormInput
          label="Longitude"
          type="number"
          step="any"
          min="-180"
          max="180"
          required={!optional || !!values.latitude}
          value={values.longitude}
          onChange={(e) => {
            const val = e.target.value;
            setValues((p) => ({ ...p, longitude: val }));
            if (val && values.latitude) identifyPlace(values.latitude, val);
          }}
        />
      </div>

      <div className="location-actions">
        <button
          type="button"
          className="text-button"
          disabled={busy}
          onClick={locate}
        >
          <LocateFixed size={16} />
          {busy ? 'Locating…' : 'Use my current location'}
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            updateCoords(
              '6.450000',
              '81.400000',
              '✓ Simulated device GPS coordinates captured (Yala Sector).',
            );
          }}
        >
          <Compass size={16} />
          Simulate device GPS
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => setShowMap((prev) => !prev)}
        >
          <MapPin size={16} />
          {showMap ? 'Hide map' : 'Open interactive map'}
        </button>
      </div>

      {successMsg && <div className="location-success">{successMsg}</div>}
      {error && <small role="alert">{error}</small>}

      {detectingPlace && (
        <div className="location-detecting">
          <LoaderCircle size={14} className="spin" />
          <span>Identifying town & area details via Geoapify API…</span>
        </div>
      )}

      {detectedPlace && !detectingPlace && (
        <div className="detected-place-card">
          <div className="place-header">
            <span className="place-title">
              <MapPin size={15} />
              <strong>
                {detectedPlace.areaTitle ||
                  detectedPlace.town ||
                  'Detected Area'}
              </strong>
            </span>
            {detectedPlace.province && (
              <span className="place-tag">{detectedPlace.province}</span>
            )}
          </div>
          <p className="place-address">{detectedPlace.formatted}</p>
          {onApplyLandmark && (
            <button
              type="button"
              className="text-button small use-landmark-btn"
              onClick={() => {
                onApplyLandmark(
                  detectedPlace.areaTitle ||
                    detectedPlace.town ||
                    detectedPlace.formatted,
                );
              }}
            >
              Apply to Nearest Landmark
            </button>
          )}
        </div>
      )}

      <div className="location-presets">
        <span className="preset-label">Quick wildlife sighting presets:</span>
        <div className="preset-buttons">
          {[
            {
              label: 'Palatupana Water Tank',
              lat: '6.372500',
              lng: '81.520400',
            },
            { label: 'Yala Menik River', lat: '6.450000', lng: '81.400000' },
            { label: 'Udawalawe Border', lat: '6.474600', lng: '80.884500' },
            { label: 'Minneriya Corridor', lat: '8.032400', lng: '80.825600' },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="preset-chip"
              onClick={() => {
                setValues((p) => ({
                  ...p,
                  ...(!p.landmark ? { landmark: preset.label } : {}),
                }));
                updateCoords(
                  preset.lat,
                  preset.lng,
                  `✓ Selected preset: ${preset.label}`,
                );
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {(showMap || hasCoords) && (
        <div className="location-preview-box">
          <div className="preview-header">
            <span>
              {hasCoords
                ? `Pinned GPS: ${values.latitude}, ${values.longitude}`
                : 'Click map to place pin'}
            </span>
            {hasCoords && (
              <button
                type="button"
                className="text-button small"
                onClick={() => {
                  setValues((p) => ({ ...p, latitude: '', longitude: '' }));
                  setSuccessMsg('');
                  setDetectedPlace(null);
                }}
              >
                Clear coordinates
              </button>
            )}
          </div>
          <LeafletLocationMap
            location={
              hasCoords
                ? {
                    latitude: Number(values.latitude),
                    longitude: Number(values.longitude),
                  }
                : null
            }
            onSelectLocation={(lat, lng) => {
              updateCoords(lat, lng, `✓ Pin placed at ${lat}, ${lng}`);
            }}
          />
          <small
            className="muted"
            style={{ display: 'block', marginTop: '6px' }}
          >
            Tip: Click the map to set or move the incident pin. You can zoom and
            drag to confirm the exact field location.
          </small>
        </div>
      )}
    </fieldset>
  );
}

export function LeafletLocationMap({
  location,
  onSelectLocation,
  className = '',
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const leafletRef = useRef(null);
  const locationRef = useRef(location);
  const selectRef = useRef(onSelectLocation);
  locationRef.current = location;
  selectRef.current = onSelectLocation;

  function validPoint(point) {
    const latitude = Number(point?.latitude);
    const longitude = Number(point?.longitude);
    return Number.isFinite(latitude) && Number.isFinite(longitude)
      ? [latitude, longitude]
      : null;
  }

  function showMarker(point, center = false) {
    const coordinates = validPoint(point);
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;
    if (!coordinates) {
      if (markerRef.current) markerRef.current.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      markerRef.current = L.marker(coordinates, {
        icon: L.divIcon({
          className: 'incident-map-marker',
          html: '<span aria-hidden="true"></span>',
          iconSize: [28, 36],
          iconAnchor: [14, 34],
        }),
      }).addTo(map);
    } else markerRef.current.setLatLng(coordinates);
    markerRef.current.bindTooltip('Incident location', {
      direction: 'top',
      offset: [0, -28],
    });
    if (center) map.setView(coordinates, Math.max(map.getZoom(), 15));
  }

  useEffect(() => {
    let disposed = false;
    import('leaflet').then(({ default: L }) => {
      if (disposed || !containerRef.current) return;
      leafletRef.current = L;
      const initial = validPoint(locationRef.current);
      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView(initial || [7.8731, 80.7718], initial ? 15 : 7);
      mapRef.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
      L.control.scale({ imperial: false }).addTo(map);
      if (selectRef.current)
        map.on('click', ({ latlng }) => {
          const latitude = latlng.lat.toFixed(6);
          const longitude = latlng.lng.toFixed(6);
          showMarker({ latitude, longitude });
          selectRef.current?.(latitude, longitude);
        });
      if (initial) showMarker(locationRef.current);
      requestAnimationFrame(() => map.invalidateSize());
    });
    return () => {
      disposed = true;
      if (mapRef.current) mapRef.current.remove();
      mapRef.current = null;
      markerRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    showMarker(location, true);
  }, [location?.latitude, location?.longitude]);

  return (
    <div className={`interactive-location-map-shell ${className}`}>
      <div
        ref={containerRef}
        className="interactive-location-map"
        aria-label={
          onSelectLocation
            ? 'Interactive incident location picker'
            : 'Incident location map'
        }
      />
      {onSelectLocation ? (
        <div className="map-offline-hint">
          Map tiles require connectivity. Pin selection and manual coordinates
          continue to work offline.
        </div>
      ) : (
        location && (
          <div className="map-location-footer">
            <div>
              <span>INCIDENT COORDINATES</span>
              <strong>
                {Number(location.latitude).toFixed(6)},{' '}
                {Number(location.longitude).toFixed(6)}
              </strong>
            </div>
            <a
              href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              Open full map ↗
            </a>
          </div>
        )
      )}
    </div>
  );
}

export function LocationMap({
  location,
  zone,
  interactive = false,
  onSelectLocation,
}) {
  if (!location && !interactive)
    return (
      <div className="map-empty">
        Coordinates were not supplied. Refer to the landmark.
      </div>
    );

  const lat = location ? Number(location.latitude) : 6.45;
  const lng = location ? Number(location.longitude) : 81.4;
  let leftPercent = 50;
  let topPercent = 38;
  if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
    const normX = Math.min(Math.max((lng - 80.0) / 2.0, 0.05), 0.95);
    const normY = Math.min(Math.max((8.8 - lat) / 2.8, 0.05), 0.85);
    leftPercent = (normX * 100).toFixed(1);
    topPercent = (normY * 100).toFixed(1);
  }

  function handleMapClick(e) {
    if (!onSelectLocation) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = Math.min(
      Math.max((e.clientX - rect.left) / rect.width, 0),
      1,
    );
    const clickY = Math.min(
      Math.max((e.clientY - rect.top) / rect.height, 0),
      1,
    );
    const newLng = (80.0 + clickX * 2.0).toFixed(6);
    const newLat = (8.8 - clickY * 2.8).toFixed(6);
    onSelectLocation(newLat, newLng);
  }

  return (
    <div
      className={`location-map ${interactive ? 'interactive' : ''}`}
      onClick={handleMapClick}
      title={interactive ? 'Click to pin GPS coordinates' : undefined}
    >
      <div className="map-grid" />
      {zone && <div className="risk-ring" />}
      {location && (
        <div
          className="map-marker"
          style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
        >
          <MapPin size={30} fill="currentColor" />
          <span>Reported location</span>
        </div>
      )}
      <div className="map-caption" onClick={(e) => e.stopPropagation()}>
        {location ? (
          <>
            <strong>
              {Number(location.latitude).toFixed(5)},{' '}
              {Number(location.longitude).toFixed(5)}
            </strong>
            <span>
              {zone
                ? `${zone.zoneName} · radius ${zone.radius} m`
                : 'Location reference'}{' '}
              · schematic
              {interactive ? ' (click to reposition)' : ', not to scale'}
            </span>
          </>
        ) : (
          <span>Click anywhere on the map grid to place a GPS pin</span>
        )}
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
