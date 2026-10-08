import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Route, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useResource } from '../../hooks/useResource';
import { api, errorMessage } from '../../services/api';
import {
  PageHeader,
  ResourceState,
  EmptyState,
  StatusBadge,
  formatDate,
  FormInput,
  Feedback,
  LocationInput,
} from '../../components/UI';
export default function PatrolManagement() {
  const { user } = useAuth();
  const resource = useResource('/patrols');
  return (
    <div className="patrol-workspace">
      <PageHeader
        eyebrow="PATROL MANAGEMENT"
        title={user.role === 'MANAGER' ? 'Patrol operations' : 'My patrols'}
        description="From route assignment to the final field observation."
      >
        {user.role === 'MANAGER' && (
          <Link to="/app/patrols/new" className="button">
            <Plus size={17} />
            Create patrol
          </Link>
        )}
      </PageHeader>
      <ResourceState resource={resource}>
        <div className="card-grid patrol-list-grid">
          {resource.data?.map((patrol) => (
            <Link
              to={`/app/patrols/${patrol._id}`}
              className="panel patrol-card"
              key={patrol._id}
            >
              <div className="section-heading">
                <span className="tile-icon">
                  <Route size={23} />
                </span>
                <StatusBadge status={patrol.status} />
              </div>
              <h2>{patrol.routeName}</h2>
              <p className="muted">{patrol.parkName}</p>
              <dl className="details">
                <dt>Assigned ranger</dt>
                <dd>{patrol.rangerId?.name}</dd>
                <dt>Scheduled</dt>
                <dd>{formatDate(patrol.scheduledDate)}</dd>
                <dt>Scheduled end</dt>
                <dd>{formatDate(patrol.scheduledEndTime)}</dd>
                <dt>Checkpoints</dt>
                <dd>{patrol.checkpoints.length}</dd>
              </dl>
              <div className="card-footer">
                View patrol <span>↗</span>
              </div>
            </Link>
          ))}
        </div>
        {resource.data?.length === 0 && (
          <EmptyState message="No patrols have been assigned yet." />
        )}
      </ResourceState>
    </div>
  );
}
export function CreatePatrol() {
  const users = useResource('/users');
  const navigate = useNavigate();
  const [values, setValues] = useState({
    routeName: '',
    parkName: 'Yala National Park',
    rangerId: '',
    scheduledDate: '',
    scheduledEndTime: '',
  });
  const [checkpoints, setCheckpoints] = useState([
    { name: '', latitude: '', longitude: '' },
  ]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const field = (name) => ({
    value: values[name],
    onChange: (e) => setValues((p) => ({ ...p, [name]: e.target.value })),
  });
  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post('/patrols', {
        ...values,
        scheduledDate: new Date(values.scheduledDate).toISOString(),
        scheduledEndTime: new Date(values.scheduledEndTime).toISOString(),
        checkpoints,
      });
      navigate(`/app/patrols/${data.data._id}`);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="patrol-workspace">
      <PageHeader
        title="Create & assign patrol"
        description="Plan a route, set checkpoints and assign a ranger."
      />
      <ResourceState resource={users}>
        <form className="panel form-panel wide-form" onSubmit={submit}>
          <Feedback error={error} />
          <div className="form-grid">
            <FormInput
              label="Route name"
              required
              maxLength={120}
              {...field('routeName')}
            />
            <FormInput
              label="Park / area"
              required
              maxLength={120}
              {...field('parkName')}
            />
            <FormInput
              label="Scheduled start time"
              type="datetime-local"
              required
              {...field('scheduledDate')}
            />
            <FormInput
              label="Scheduled end time"
              type="datetime-local"
              required
              min={values.scheduledDate || undefined}
              {...field('scheduledEndTime')}
            />
            <FormInput
              label="Assign ranger"
              required
              options={[
                { value: '', label: 'Select a ranger' },
                ...(users.data || [])
                  .filter((user) => user.role === 'RANGER')
                  .map((user) => ({ value: user._id, label: user.name })),
              ]}
              {...field('rangerId')}
            />
          </div>
          <div className="section-heading">
            <h2>Route checkpoints</h2>
            <button
              type="button"
              className="button secondary small"
              disabled={checkpoints.length >= 30}
              onClick={() =>
                setCheckpoints((p) => [
                  ...p,
                  { name: '', latitude: '', longitude: '' },
                ])
              }
            >
              + Add checkpoint
            </button>
          </div>
          {checkpoints.map((checkpoint, index) => (
            <div className="checkpoint-form" key={index}>
              <FormInput
                label={`Checkpoint ${index + 1} name`}
                required
                maxLength={120}
                value={checkpoint.name}
                onChange={(e) =>
                  setCheckpoints((p) =>
                    p.map((c, i) =>
                      i === index ? { ...c, name: e.target.value } : c,
                    ),
                  )
                }
              />
              <LocationInput
                values={checkpoint}
                setValues={(update) =>
                  setCheckpoints((p) =>
                    p.map((c, i) => (i === index ? update(c) : c)),
                  )
                }
              />
              {checkpoints.length > 1 && (
                <button
                  type="button"
                  className="text-button danger"
                  onClick={() =>
                    setCheckpoints((p) => p.filter((_, i) => i !== index))
                  }
                >
                  Remove checkpoint
                </button>
              )}
            </div>
          ))}
          <div className="button-row">
            <button className="button" disabled={busy}>
              {busy ? 'Assigning…' : 'Create & assign patrol'}
            </button>
            <Link className="button secondary" to="/app/patrols">
              Cancel
            </Link>
          </div>
        </form>
      </ResourceState>
    </div>
  );
}
