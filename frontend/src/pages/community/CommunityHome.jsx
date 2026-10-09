import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  MapPin,
  ShieldCheck,
  Users,
  AlertTriangle,
  MessageSquare,
  CheckCircle,
  Eye,
} from 'lucide-react';
import { api, errorMessage } from '../../services/api';

export default function CommunityHome() {
  const navigate = useNavigate();
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsText, setSmsText] = useState('ELEPHANT North Waterhole 3');
  const [smsSender, setSmsSender] = useState('0771234567');
  const [smsResult, setSmsResult] = useState('');
  const [smsError, setSmsError] = useState('');
  const [smsBusy, setSmsBusy] = useState(false);
  const [homeNotice, setHomeNotice] = useState('');

  async function handleSendSms(e) {
    e.preventDefault();
    setSmsBusy(true);
    setSmsError('');
    setSmsResult('');
    try {
      const { data } = await api.post('/community-reports/sms', {
        message: smsText,
        sender: smsSender,
      });
      const reply = data.data.reply;
      setSmsResult(reply);
      window.dispatchEvent(new Event('new-community-report'));
      setTimeout(() => {
        setShowSmsModal(false);
        setSmsBusy(false);
        setHomeNotice(`SMS report delivered: "${reply}"`);
        navigate('/');
      }, 700);
    } catch (err) {
      setSmsError(errorMessage(err));
      setSmsBusy(false);
    }
  }

  return (
    <>
      {homeNotice && (
        <div
          className="notice success"
          style={{
            margin: '14px 6% 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} />
            <span>{homeNotice}</span>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={() => setHomeNotice('')}
            aria-label="Dismiss notice"
            style={{ padding: '0 4px' }}
          >
            ✕
          </button>
        </div>
      )}

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">PEOPLE & WILDLIFE, TOGETHER</p>
          <h1>
            A safer place
            <br />
            for every <em>footprint.</em>
          </h1>
          <p>
            Your observations help rangers and community liaison officers
            monitor elephant movement and respond quickly to prevent human-wildlife conflict.
          </p>

          <div className="hero-action-group">
            <div className="report-action-cards">
              <Link className="hero-cta-card primary" to="/report?type=sighting">
                <div className="cta-icon-box primary">
                  <Eye size={18} />
                </div>
                <strong className="cta-title">Report Elephant Sighting</strong>
                <span className="cta-arrow-circle">
                  <ArrowUpRight size={15} />
                </span>
              </Link>

              <Link className="hero-cta-card warning" to="/report?type=crop-raiding">
                <div className="cta-icon-box warning">
                  <AlertTriangle size={18} />
                </div>
                <strong className="cta-title">Report Crop-Raiding</strong>
                <span className="cta-arrow-circle">
                  <ArrowUpRight size={15} />
                </span>
              </Link>
            </div>

            <div className="hero-sms-card">
              <div className="sms-card-lead">
                <div className="sms-icon-bubble">
                  <MessageSquare size={16} />
                </div>
                <span className="sms-main-text">
                  No smartphone or mobile data? <strong>SMS to 1990</strong>
                </span>
              </div>
              <button
                type="button"
                className="sms-pill-btn"
                onClick={() => setShowSmsModal(true)}
              >
                Simulate SMS
              </button>
            </div>

            <p className="hero-sms-note">
              <span>
                📡 <strong>Offline reporting:</strong> If you have no internet coverage, send an SMS with format <code>ELEPHANT &lt;landmark&gt; [count]</code> to short code <strong>1990</strong>.
              </span>
            </p>
          </div>

          <span className="hero-note">
            No account needed · Instant dispatch to field rangers & liaison officers
          </span>
        </div>

        <div className="landscape">
          <img
            src="/images/yala-elephants-hero.png"
            alt="A family of elephants walking through Yala National Park"
          />
          <div className="landscape-label">
            <MapPin size={16} /> Yala National Park, Sri Lanka
          </div>
        </div>
      </section>

      {showSmsModal && (
        <div className="modal-backdrop" onClick={() => setShowSmsModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="SMS Short Code Simulator"
          >
            <div className="section-heading">
              <h2>SMS Short-Code Reporting (1990)</h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowSmsModal(false)}
              >
                ✕
              </button>
            </div>
            <p className="muted">
              Simulates structured SMS reporting from villagers without smartphones or data connectivity.
            </p>
            <form onSubmit={handleSendSms} className="form-panel">
              <label className="field">
                <span>Sender phone number</span>
                <input
                  type="text"
                  value={smsSender}
                  onChange={(e) => setSmsSender(e.target.value)}
                  placeholder="e.g. 0771234567"
                />
              </label>
              <label className="field">
                <span>SMS Message content</span>
                <input
                  type="text"
                  value={smsText}
                  onChange={(e) => setSmsText(e.target.value)}
                  placeholder="ELEPHANT <landmark> <count>"
                  required
                />
                <small className="muted">Format: ELEPHANT &lt;location&gt; &lt;number of elephants&gt;</small>
              </label>

              {smsError && <p className="field-error">{smsError}</p>}
              {smsResult && (
                <div className="notice success">
                  <CheckCircle size={16} /> {smsResult}
                </div>
              )}

              <div className="button-row">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setShowSmsModal(false);
                    navigate('/');
                  }}
                >
                  {smsResult ? 'Back to Home' : 'Close'}
                </button>
                <button type="submit" className="button" disabled={smsBusy}>
                  {smsBusy ? 'Sending…' : 'Send SMS Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="public-intro">
        <p className="eyebrow">A SHARED RESPONSIBILITY</p>
        <h2>Small observations. Meaningful protection.</h2>
        <div className="three-grid">
          <article className="panel">
            <MapPin />
            <h3>Share what you see</h3>
            <p>
              Tell us the nearest landmark, herd size, direction of movement, or agricultural crop damage.
            </p>
          </article>
          <article className="panel">
            <Users />
            <h3>Connect with field teams</h3>
            <p>
              Reports notify on-duty park rangers and community liaison officers immediately.
            </p>
          </article>
          <article className="panel">
            <ShieldCheck />
            <h3>Keep a safe distance</h3>
            <p>
              Observe from a safe place. Do not approach or disturb wildlife to
              take a photograph.
            </p>
          </article>
        </div>
        <p className="muted">
          This is a university demonstration. Reports are stored for the demo
          and do not contact emergency services.
        </p>
      </section>
    </>
  );
}
