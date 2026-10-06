import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Radio, Battery } from 'lucide-react';
import { useResource } from '../../hooks/useResource';
import { api, errorMessage } from '../../services/api';
import {
  PageHeader,
  ResourceState,
  StatusBadge,
  formatDate,
  FormInput,
  Feedback,
  LocationMap,
  EmptyState,
} from '../../components/UI';
export default function AnimalTracking() {
  const animals = useResource('/animals');
  const zones = useResource('/risk-zones');
  const [selected, setSelected] = useState('');
  const [zoneId, setZoneId] = useState('safe');
  const [history, setHistory] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function simulate() {
    setError('');
    setResult(null);
    setBusy(true);
    const zone = zones.data?.find((zone) => zone._id === zoneId);
    try {
      const { data } = await api.post('/collar-readings', {
        collarId: selected,
        latitude: zone ? zone.centerLatitude : 0,
        longitude: zone ? zone.centerLongitude : 0,
      });
      setResult(data.data);
      setHistory(null);
      animals.reload();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function loadHistory(collarId) {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.get(`/collar-readings/${collarId}`);
      setHistory({ collarId, readings: data.data });
      setSelected(collarId);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="COLLAR MONITORING"
        title="Animal tracking"
        description="A connected view of wildlife movement and collar health."
      >
        <span className="badge badge-simulation">
          <Radio size={13} /> Simulated IoT
        </span>
      </PageHeader>
      <Feedback error={error} />
      <ResourceState resource={animals}>
        <div className="card-grid">
          {animals.data?.map((animal) => (
            <article className="panel animal-card" key={animal._id}>
              <div className="section-heading">
                <span className="animal-code">{animal.animalId}</span>
                <StatusBadge status={animal.status} />
              </div>
              <h2>{animal.tagName}</h2>
              <p className="muted">
                {animal.gender} · {animal.age} years · {animal.collarId}
              </p>
              <LocationMap location={animal.collar?.lastLocation} />
              <div className="collar-health">
                <span>
                  <Battery size={18} />
                  {animal.collar?.batteryLevel ?? '—'}% battery
                </span>
                <StatusBadge status={animal.collar?.status || 'Unknown'} />
              </div>
              <small className="muted">
                Last transmission: {formatDate(animal.collar?.lastTransmission)}
              </small>
              <button
                className="button secondary full"
                disabled={busy}
                onClick={() => loadHistory(animal.collarId)}
              >
                Collar details & reading history
              </button>
            </article>
          ))}
        </div>
        {animals.data?.length === 0 && (
          <EmptyState message="No animals found. Run the demo seed to populate tracking data." />
        )}
      </ResourceState>
      <section className="panel section-gap">
        <div className="section-heading">
          <div>
            <h2>Simulate collar reading</h2>
            <p className="muted">
              Choose a safe location or a risk-zone centre to demonstrate
              detection.
            </p>
          </div>
          <Radio className="muted" />
        </div>
        <ResourceState resource={zones}>
          <form
            className="simulator"
            onSubmit={(event) => {
              event.preventDefault();
              simulate();
            }}
          >
            <FormInput
              label="GPS collar"
              required
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              options={[
                { value: '', label: 'Select collar' },
                ...(animals.data || []).map((animal) => ({
                  value: animal.collarId,
                  label: `${animal.collarId} · ${animal.tagName}`,
                })),
              ]}
            />
            <FormInput
              label="Simulated location"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              options={[
                { value: 'safe', label: 'Safe test location (0, 0)' },
                ...(zones.data || []).map((zone) => ({
                  value: zone._id,
                  label: `${zone.zoneName} · ${zone.riskLevel}`,
                })),
              ]}
            />
            <button className="button" disabled={busy || !selected}>
              {busy ? 'Sending…' : 'Simulate Collar Reading'}
            </button>
          </form>
        </ResourceState>
        {result && (
          <div className="feedback success" role="status">
            Reading saved.{' '}
            {result.alerts.length ? (
              <>
                {result.alerts.length} high-risk alert(s) created or updated.{' '}
                <Link to={`/app/alerts/${result.alerts[0]._id}`}>
                  View alert →
                </Link>
              </>
            ) : (
              'Outside high-risk zones; no alert generated.'
            )}
          </div>
        )}
      </section>
      {history && (
        <section className="panel section-gap">
          <h2>{history.collarId} · Recent readings</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                </tr>
              </thead>
              <tbody>
                {history.readings.map((reading) => (
                  <tr key={reading._id}>
                    <td>{formatDate(reading.timestamp)}</td>
                    <td>{reading.latitude}</td>
                    <td>{reading.longitude}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!history.readings.length && (
              <EmptyState message="No readings received yet." />
            )}
          </div>
          <p className="muted">Most recent 100 readings.</p>
        </section>
      )}
      <section className="section-gap">
        <h2>Monitored risk zones</h2>
        <div className="three-grid">
          {zones.data?.map((zone) => (
            <article className="panel" key={zone._id}>
              <StatusBadge status={zone.riskLevel} />
              <h3>{zone.zoneName}</h3>
              <p className="muted">{zone.description}</p>
              <small>
                Radius {zone.radius} m · {zone.centerLatitude},{' '}
                {zone.centerLongitude}
              </small>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
