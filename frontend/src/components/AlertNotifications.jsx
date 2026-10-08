import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { get, errorMessage } from '../services/api';
import { formatDate, StatusBadge } from './UI';

export default function AlertNotifications() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const root = useRef(null);
  const button = useRef(null);
  const panelId = useId();
  const { pathname } = useLocation();

  useEffect(() => {
    let active = true;
    let pending = false;
    async function load() {
      if (pending) return;
      pending = true;
      try {
        const records = await get('/alerts');
        if (active) {
          setAlerts(records);
          setError('');
        }
      } catch (failure) {
        if (active) setError(errorMessage(failure));
      } finally {
        pending = false;
      }
    }
    load();
    const timer = setInterval(load, 30000);
    window.addEventListener('focus', load);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('focus', load);
    };
  }, [pathname, refresh]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function outside(event) {
      if (!root.current?.contains(event.target)) setOpen(false);
    }
    function escape(event) {
      if (event.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const pendingCount =
    alerts?.filter((item) => item.status === 'New').length || 0;
  const records = (alerts || [])
    .filter((item) => item.status !== 'Resolved')
    .sort(
      (a, b) =>
        Number(Boolean(b.escalatedAt) && b.status === 'New') -
          Number(Boolean(a.escalatedAt) && a.status === 'New') ||
        new Date(b.createdAt) - new Date(a.createdAt),
    );
  return (
    <div className="alert-notifications" ref={root}>
      <button
        type="button"
        className="icon-button notification-toggle"
        ref={button}
        aria-label={
          error
            ? 'Alert notifications unavailable'
            : `Alert notifications, ${pendingCount} awaiting acknowledgement`
        }
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (!open) setRefresh((value) => value + 1);
          setOpen((value) => !value);
        }}
      >
        <Bell size={21} aria-hidden="true" />
        {!error && pendingCount > 0 && (
          <span className="notification-count" aria-hidden="true">
            {pendingCount > 99 ? '99+' : pendingCount}
          </span>
        )}
      </button>
      {open && (
        <section
          className="notification-panel"
          id={panelId}
          aria-label="Alert notifications"
        >
          <div className="notification-heading">
            <strong>Alert notifications</strong>
            <small>
              Awaiting acknowledgement: {error ? 'Unavailable' : pendingCount}
            </small>
          </div>
          {error ? (
            <div className="notification-message">
              <p role="alert">{error}</p>
              <button
                className="button secondary small"
                onClick={() => setRefresh((value) => value + 1)}
              >
                Retry
              </button>
            </div>
          ) : alerts === null ? (
            <p className="notification-message" role="status">
              Loading alerts…
            </p>
          ) : !records.length ? (
            <p className="notification-message">No open alerts.</p>
          ) : (
            <ul className="notification-list">
              {records.slice(0, 5).map((alert) => (
                <li key={alert._id}>
                  <Link
                    to={`/app/alerts/${alert._id}`}
                    onClick={() => setOpen(false)}
                  >
                    <strong>
                      {alert.animalId?.tagName ||
                        alert.collarId ||
                        'Wildlife alert'}
                    </strong>
                    <span>{alert.message}</span>
                    <div className="notification-badges">
                      <StatusBadge status={alert.priority} />
                      <StatusBadge
                        status={
                          alert.escalatedAt && alert.status === 'New'
                            ? 'Escalated'
                            : alert.status
                        }
                      />
                    </div>
                    <small>
                      {formatDate(alert.lastDetectedAt || alert.createdAt)}
                    </small>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            className="notification-footer"
            to="/app/alerts"
            onClick={() => setOpen(false)}
          >
            View all alerts
          </Link>
          <small className="notification-hint">
            Refreshes every 30 seconds. Opening a notification does not
            acknowledge it.
          </small>
        </section>
      )}
    </div>
  );
}
