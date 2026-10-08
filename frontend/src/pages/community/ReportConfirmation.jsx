import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
export default function ReportConfirmation() {
  const { state } = useLocation();
  return (
    <section className="confirmation panel">
      <CheckCircle2 size={56} />
      <p className="eyebrow">
        {state?.id ? 'REPORT RECEIVED' : 'COMMUNITY REPORTING'}
      </p>
      <h1>
        {state?.id
          ? 'Thank you for looking out for wildlife.'
          : 'Have you seen elephants nearby?'}
      </h1>
      <p>
        {state?.id
          ? 'Your sighting has been saved and is available to the conservation team for review.'
          : 'Submit a sighting to receive a report reference.'}
      </p>
      {state?.id && (
        <div className="reference">
          Report reference<strong>{state.id}</strong>
        </div>
      )}
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
