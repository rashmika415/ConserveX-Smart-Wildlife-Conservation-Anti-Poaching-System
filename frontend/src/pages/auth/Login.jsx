import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Leaf, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../services/api';
import { FormInput, Feedback } from '../../components/UI';
export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/app" replace />;
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate('/app');
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <div className="login-story">
        <Leaf size={42} />
        <p className="eyebrow">ON THE FRONTLINE OF CONSERVATION</p>
        <h1>
          Every action.
          <br />A safer wild.
        </h1>
        <p>
          One connected workspace for the people protecting our wildlife and
          communities.
        </p>
        <div className="story-footer">
          <ShieldCheck /> Field teams · Park management · Community response
        </div>
      </div>
      <section className="login-card">
        <p className="eyebrow">WELCOME BACK</p>
        <h2>Sign in to your workspace</h2>
        <p className="muted">Use your staff account to continue.</p>
        <Feedback error={error} />
        <form onSubmit={submit}>
          <FormInput
            label="Email address"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <FormInput
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="button full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="muted login-note">
          Community member?{' '}
          <Link to="/report">Report an elephant sighting</Link> without an
          account.
        </p>
      </section>
    </div>
  );
}
