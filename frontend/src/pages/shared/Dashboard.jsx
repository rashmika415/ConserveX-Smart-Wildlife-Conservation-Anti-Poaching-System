import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Route,
  FileWarning,
  Bell,
  Users,
  ArrowUpRight,
  Radio,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { get, errorMessage } from '../../services/api';
import {
  DashboardCard,
  PageHeader,
  Feedback,
  LoadingSpinner,
  EmptyState,
  StatusBadge,
  formatDate,
} from '../../components/UI';
function RecentPanel({ title, items, path, label, subtitle, icon: Icon }) {
  return (
    <section className="panel recent-panel">
      <div className="section-heading">
        <h2>
          <Icon size={18} />
          {title}
        </h2>
        <Link className="text-link" to={path}>
          View all <ArrowUpRight size={15} />
        </Link>
      </div>
      {items.length ? (
        <div className="recent-list">
          {items.slice(0, 4).map((item) => (
            <Link
              className="recent-item"
              key={item._id}
              to={`${path}/${item._id}`}
            >
              <div>
                <strong>{label(item)}</strong>
                <small>{subtitle(item)}</small>
              </div>
              <StatusBadge
                status={
                  item.escalatedAt && item.status === 'New'
                    ? 'Escalated'
                    : item.status
                }
              />
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </section>
  );
}
export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [alerts, incidents, patrols, community] = await Promise.all([
          get('/alerts'),
          user.role !== 'LIAISON' ? get('/incidents') : [],
          user.role !== 'LIAISON' ? get('/patrols') : [],
          get('/community-reports').catch(() => []),
        ]);
        if (active) {
          setData({ alerts, incidents, patrols, community });
          setError('');
        }
      } catch (error) {
        if (active) setError(errorMessage(error));
      }
    };
    load();
    const timer = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [user.role, refresh]);
  const title = {
    MANAGER: 'Conservation overview',
    RANGER: 'The field, at a glance.',
    LIAISON: 'Community response overview',
  }[user.role];
  const currentPatrol =
    data?.patrols.find((p) => p.status === 'Active') ||
    [...(data?.patrols || [])].reverse().find((p) => p.status === 'Assigned');
  const responses =
    data?.community
      .flatMap((report) =>
        report.responses.map((response) => ({ ...response, report })),
      )
      .sort((a, b) => new Date(b.respondedAt) - new Date(a.respondedAt)) || [];
  return (
    <div className={user.role === 'RANGER' ? 'ranger-dashboard' : ''}>
      <PageHeader
        eyebrow={
          user.role === 'RANGER'
            ? 'RANGER OPERATIONS / YALA NATIONAL PARK'
            : 'CONSERVATION OPERATIONS'
        }
        title={title}
        description={`Welcome back, ${user.name.split(' ')[0]}. Here’s what needs your attention.`}
      >
        <span className="date-chip">
          {new Date().toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      </PageHeader>
      <Feedback error={error} />
      {error && (
        <button
          className="button secondary"
          onClick={() => setRefresh((p) => p + 1)}
        >
          Retry dashboard
        </button>
      )}
      {!data && !error && <LoadingSpinner />}
      {data && (
        <div className="dashboard-content">
          <div className="stats-grid">
            {user.role !== 'LIAISON' && (
              <>
                <DashboardCard
                  label="Active patrols"
                  value={
                    data.patrols.filter((p) => p.status === 'Active').length
                  }
                  icon={Route}
                  to="/app/patrols"
                />
                <DashboardCard
                  label="Open incidents"
                  value={
                    data.incidents.filter((p) => p.status !== 'Resolved').length
                  }
                  icon={FileWarning}
                  tone="orange"
                  to="/app/incidents"
                />
              </>
            )}
            <DashboardCard
              label="High-risk alerts"
              value={data.alerts.filter((p) => p.status !== 'Resolved').length}
              icon={Bell}
              tone="amber"
              to="/app/alerts"
            />
            <DashboardCard
              label={user.role === 'RANGER' ? 'Community sightings' : 'Community reports'}
              value={
                data.community.filter(
                  (p) => !['Resolved', 'False Report'].includes(p.status),
                ).length
              }
              icon={Users}
              tone="blue"
              to="/app/community"
            />
            {user.role === 'RANGER' && (
              <DashboardCard
                label="Assigned patrols"
                value={
                  data.patrols.filter((p) => p.status === 'Assigned').length
                }
                icon={Route}
                tone="blue"
                to="/app/patrols"
              />
            )}
            {user.role === 'LIAISON' && (
              <>
                <DashboardCard
                  label="New reports"
                  value={
                    data.community.filter((p) => p.status === 'New').length
                  }
                  icon={Users}
                  to="/app/community"
                />
                <DashboardCard
                  label="Awaiting response"
                  value={
                    data.community.filter(
                      (p) =>
                        !p.responses.length &&
                        !['Resolved', 'False Report'].includes(p.status),
                    ).length
                  }
                  icon={FileWarning}
                  tone="orange"
                  to="/app/community"
                />
              </>
            )}
          </div>
          <section className="operations-banner">
            <div>
              <span className="eyebrow">
                {user.role === 'RANGER'
                  ? 'ON THE GROUND. FOR THE WILD.'
                  : 'CONNECTED CONSERVATION'}
              </span>
              <h2>
                {user.role === 'RANGER'
                  ? 'Every patrol protects a future.'
                  : 'One park. One coordinated team.'}
              </h2>
              <p>
                {user.role === 'RANGER'
                  ? 'Stay ready. Follow your route. Make every observation count.'
                  : 'Track the field, listen to communities and act on risk.'}
              </p>
            </div>
            <div className="banner-actions">
              {user.role === 'MANAGER' ? (
                <>
                  <Link className="button light" to="/app/patrols/new">
                    Create patrol <ArrowUpRight size={16} />
                  </Link>
                  <Link to="/app/tracking">
                    Animal tracking <Radio size={16} />
                  </Link>
                </>
              ) : user.role === 'RANGER' ? (
                <>
                  <Link className="button light" to="/app/incidents/new">
                    Report Incident <ArrowUpRight size={16} />
                  </Link>
                  <Link to="/app/patrols">
                    My Patrols <Route size={16} />
                  </Link>
                </>
              ) : (
                <Link className="button light" to="/app/community">
                  Review reports <ArrowUpRight size={16} />
                </Link>
              )}
            </div>
          </section>
          {user.role === 'RANGER' && (
            <section className="panel section-gap ranger-patrol-panel">
              <div className="section-heading">
                <h2>Current / next patrol</h2>
                <Route size={20} aria-hidden="true" />
              </div>
              {currentPatrol ? (
                <div className="current-patrol">
                  <div>
                    <h3>{currentPatrol.routeName}</h3>
                    <p className="muted">
                      {currentPatrol.parkName} ·{' '}
                      {formatDate(currentPatrol.scheduledDate)}
                    </p>
                    <StatusBadge status={currentPatrol.status} />
                    <div className="ranger-route-facts">
                      <span>
                        <strong>
                          {currentPatrol.checkpoints?.length || 0}
                        </strong>{' '}
                        Route checkpoints
                      </span>
                      <span>
                        <strong>{currentPatrol.waypoints?.length || 0}</strong>{' '}
                        Recorded waypoints
                      </span>
                    </div>
                  </div>
                  <Link
                    className="button"
                    to={`/app/patrols/${currentPatrol._id}`}
                  >
                    {currentPatrol.status === 'Active'
                      ? 'Continue patrol'
                      : 'View & start patrol'}
                  </Link>
                </div>
              ) : (
                <EmptyState message="No active or assigned patrol. Your next assignment will appear here." />
              )}
            </section>
          )}
          <div className="dashboard-grid section-gap">
            {user.role !== 'LIAISON' && (
              <RecentPanel
                title="Recent incidents"
                items={data.incidents}
                path="/app/incidents"
                label={(i) => i.incidentType}
                subtitle={(i) =>
                  `${i.rangerId?.name || 'Ranger'} · ${formatDate(i.createdAt)}`
                }
                icon={FileWarning}
              />
            )}
            <RecentPanel
              title="Recent alerts"
              items={data.alerts}
              path="/app/alerts"
              label={(i) => i.animalId?.tagName || 'Tracked animal'}
              subtitle={(i) => i.zoneId?.zoneName || i.message}
              icon={Bell}
            />
            <RecentPanel
              title="Community sightings"
              items={data.community}
              path={user.role === 'RANGER' ? '/app/community' : '/app/community'}
              label={(i) => `${i.landmark} (${i.numberOfElephants} elephant${i.numberOfElephants > 1 ? 's' : ''})`}
              subtitle={(i) =>
                `${i.directionOfMovement ? 'Moving ' + i.directionOfMovement + ' · ' : ''}${formatDate(i.createdAt)}`
              }
              icon={Users}
            />
            {user.role !== 'LIAISON' && (
              <RecentPanel
                title="Patrol activity"
                items={data.patrols}
                path="/app/patrols"
                label={(i) => i.routeName}
                subtitle={(i) =>
                  `${i.rangerId?.name || 'Ranger'} · ${formatDate(i.scheduledDate)}`
                }
                icon={Route}
              />
            )}
            {user.role === 'LIAISON' && (
              <section className="panel">
                <h2>Recent response actions</h2>
                {responses.slice(0, 5).map((response) => (
                  <Link
                    key={response._id}
                    className="recent-item"
                    to={`/app/community/${response.report._id}`}
                  >
                    <div>
                      <strong>{response.action}</strong>
                      <small>
                        {response.report.landmark} ·{' '}
                        {formatDate(response.respondedAt)}
                      </small>
                    </div>
                  </Link>
                ))}
                {!responses.length && (
                  <EmptyState message="No response actions recorded yet." />
                )}
              </section>
            )}
          </div>
          <p className="dashboard-note">
            <span className="dot" />
            Dashboard refreshes every 30 seconds · All figures reflect saved
            records
          </p>
        </div>
      )}
    </div>
  );
}
