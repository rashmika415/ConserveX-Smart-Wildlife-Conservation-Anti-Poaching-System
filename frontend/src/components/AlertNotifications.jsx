import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { get, errorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, StatusBadge } from './UI';

export default function AlertNotifications() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState(null);
  const [sightings, setSightings] = useState([]);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const root = useRef(null);
  const button = useRef(null);
  const panelId = useId();
  const { pathname } = useLocation();
  const auth = useAuth?.() || null;
  const user = auth?.user || null;

  useEffect(() => {
    let active = true;
    let pending = false;
    async function load() {
      if (pending) return;
      pending = true;
      try {
        const hasAuth = Boolean(
          user ||
            (typeof sessionStorage !== 'undefined' &&
              sessionStorage.getItem('conservex-token')),
        );
        const [records, communityRecords] = await Promise.all([
          get('/alerts'),
          hasAuth
            ? get('/community-reports/notifications').catch(() => [])
            : Promise.resolve([]),
        ]);
        if (active) {
          setAlerts(records);
          setSightings(
            (communityRecords || []).filter(
              (item) =>
                item &&
                (item.isCommunityReport || item.numberOfElephants != null),
            ),
          );
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
    window.addEventListener('new-community-report', load);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('focus', load);
      window.removeEventListener('new-community-report', load);
    };
  }, [pathname, refresh, user]);

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

  const pendingAlerts =
    alerts?.filter((item) => item.status === 'New').length || 0;
  const pendingSightings =
    sightings?.filter((item) => item.status === 'New').length || 0;
  const pendingCount = pendingAlerts + pendingSightings;

  const openAlerts = (alerts || []).filter((item) => item.status !== 'Resolved');
  const openSightings = (sightings || []).filter(
    (item) => item.status !== 'Resolved',
  );

  const records = [...openAlerts, ...openSightings].sort((a, b) => {
    const aEscalated = Boolean(a.escalatedAt) && a.status === 'New';
    const bEscalated = Boolean(b.escalatedAt) && b.status === 'New';
    if (bEscalated !== aEscalated) return Number(bEscalated) - Number(aEscalated);

    const aTime = new Date(a.createdAt || a.lastDetectedAt || 0).getTime();
    const bTime = new Date(b.createdAt || b.lastDetectedAt || 0).getTime();
    return bTime - aTime;
  });

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
              {records.slice(0, 5).map((item) => {
                if (item.isCommunityReport || item.numberOfElephants != null) {
                  const isRanger = user?.role === 'RANGER';
                  const linkTarget = isRanger
                    ? '/app'
                    : `/app/community/${item._id}`;
                  return (
                    <li key={`community-${item._id}`}>
                      <Link to={linkTarget} onClick={() => setOpen(false)}>
                        <strong>
                          {item.landmark
                            ? `Elephant Sighting · ${item.landmark}`
                            : 'Elephant Sighting'}
                        </strong>
                        <span>
                          {item.message ||
                            `${item.numberOfElephants} elephant${item.numberOfElephants > 1 ? 's' : ''} reported`}
                        </span>
                        <div className="notification-badges">
                          <span className="badge badge-community">
                            Elephant Sighting
                          </span>
                          <StatusBadge status={item.status} />
                        </div>
                        <small>{formatDate(item.createdAt)}</small>
                      </Link>
                    </li>
                  );
                }

                return (
                  <li key={item._id}>
                    <Link
                      to={`/app/alerts/${item._id}`}
                      onClick={() => setOpen(false)}
                    >
                      <strong>
                        {item.animalId?.tagName ||
                          item.collarId ||
                          'Wildlife alert'}
                      </strong>
                      <span>{item.message}</span>
                      <div className="notification-badges">
                        <StatusBadge status={item.priority} />
                        <StatusBadge
                          status={
                            item.escalatedAt && item.status === 'New'
                              ? 'Escalated'
                              : item.status
                          }
                        />
                      </div>
                      <small>
                        {formatDate(item.lastDetectedAt || item.createdAt)}
                      </small>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="notification-footer-links">
            <Link
              className="notification-footer"
              to="/app/alerts"
              onClick={() => setOpen(false)}
            >
              View all alerts
            </Link>
            {user?.role !== 'RANGER' && (
              <Link
                className="notification-footer"
                to="/app/community"
                onClick={() => setOpen(false)}
              >
                Community reports
              </Link>
            )}
          </div>
          <small className="notification-hint">
            Refreshes every 30 seconds. Opening a notification does not
            acknowledge it.
          </small>
        </section>
      )}
    </div>
  );
}
