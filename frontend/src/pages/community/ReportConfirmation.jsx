import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, Users, Radio } from 'lucide-react';

export default function ReportConfirmation() {
  const { state } = useLocation();
  const rawId = state?.id || '';
  const refCode = rawId.startsWith('OFFLINE-')
    ? `#CR-OFFLINE-${rawId.slice(-6)}`
    : rawId.length >= 6
      ? `#CR-${new Date().getFullYear()}-${rawId.slice(-4).toUpperCase()}`
      : `#CR-${rawId || 'PENDING'}`;

  return (
    <section className="confirmation panel">
      <CheckCircle2 size={64} className="confirmation-icon" />

      <p className="eyebrow">
        {state?.id ? 'REPORT TRANSMITTED' : 'COMMUNITY REPORTING'}
      </p>

      <h1>
        {state?.id
          ? 'Report Submitted!'
          : 'Have you seen elephants nearby?'}
      </h1>

      <p className="lead-text">
        {state?.id
          ? 'Thank you for keeping Yala safe! Your report has been dispatched to field operations.'
          : 'Submit a sighting to alert the response team.'}
      </p>

      {state?.corroborated && (
        <div className="notice info">
          <Radio size={16} /> <strong>Corroborating Sighting Confirmed:</strong> Another
          observation was recently reported in this area. Your sighting has been linked to verify
          active elephant movement.
        </div>
      )}

      {state?.offline && (
        <div className="notice warning">
          <strong>Saved Offline:</strong> Your report is safely stored on this device. It will
          automatically transmit to rangers as soon as network coverage is available.
        </div>
      )}

      {state?.id && (
        <div className="reference">
          Reference ID<strong>{refCode}</strong>
          <small className="raw-id muted">Database record: {state.id}</small>
        </div>
      )}

      <div className="confirmation-recipients">
        <div className="recipient-pill">
          <ShieldCheck size={16} /> On-duty Park Rangers notified
        </div>
        <div className="recipient-pill">
          <Users size={16} /> Community Liaison Officer notified
        </div>
      </div>

      <div className="button-row">
        <Link className="button" to="/">
          Back to home
        </Link>
        <Link className="button secondary" to="/report">
          Report another sighting
        </Link>
      </div>
    </section>
  );
}
