import { useEffect, useState } from 'react';
import { apiGet, type DemoUser, type Health } from './services/api';
import { useOnline } from './hooks/useOnline';
import { ModulePlaceholder } from './components/ModulePlaceholder';

const modules = [
  {
    title: 'Incident Management',
    description: 'Report ranger incidents and track synchronization.',
  },
  {
    title: 'Collar Monitoring',
    description: 'Monitor simulated collar readings and high-risk zone alerts.',
  },
  {
    title: 'Patrol Management',
    description: 'Plan routes, assign rangers and record patrol progress.',
  },
  {
    title: 'Community Reporting',
    description:
      'Receive sightings, simulated SMS reports and response actions.',
  },
];
export function App() {
  const [users, setUsers] = useState<DemoUser[]>([]);
  const [userId, setUserId] = useState('R001');
  const [database, setDatabase] = useState<string>('Checking connection...');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(0);
  const online = useOnline();
  useEffect(() => {
    let active = true;
    Promise.all([apiGet<DemoUser[]>('/demo-users'), apiGet<Health>('/health')])
      .then(([demoUsers, health]) => {
        if (active) {
          setUsers(demoUsers);
          setDatabase(health.database.replaceAll('_', ' '));
        }
      })
      .catch(() => {
        if (active) {
          setError('Cannot reach the API. Check that the backend is running.');
          setDatabase('Unavailable');
        }
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <div className="layout">
      <header>
        <div>
          <h1>ConserveX</h1>
          <p>Smart Wildlife Conservation & Anti-Poaching Monitoring</p>
        </div>
        <span role="status">{online ? 'Online' : 'Offline'}</span>
      </header>
      <main>
        <section className="panel">
          <h2>Development workspace</h2>
          <p>Database: {database}</p>
          <label htmlFor="demo-user">Demo role </label>
          <select
            id="demo-user"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            disabled={!users.length}
          >
            {users.map((user) => (
              <option key={user.userId} value={user.userId}>
                {user.name} ({user.userId})
              </option>
            ))}
          </select>
          <p className="muted">
            Predefined users for development. Role selection does not
            authenticate requests.
          </p>
          {error && <p role="alert">{error}</p>}
        </section>
        <nav aria-label="Business modules">
          {modules.map((module, index) => (
            <button
              key={module.title}
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
            >
              {module.title}
            </button>
          ))}
        </nav>
        <ModulePlaceholder {...modules[selected]} />
      </main>
    </div>
  );
}
