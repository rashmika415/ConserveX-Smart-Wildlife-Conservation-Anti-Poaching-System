import { useAuth } from '../../context/AuthContext';
import { PageHeader, roleLabel } from '../../components/UI';
export default function Profile() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader
        title="Your profile"
        description="Your conservation workspace identity."
      />
      <section className="panel profile-panel">
        <span className="avatar large">{user.name[0]}</span>
        <h2>{user.name}</h2>
        <dl className="details">
          <dt>Email</dt>
          <dd>{user.email}</dd>
          <dt>Role</dt>
          <dd>{roleLabel[user.role]}</dd>
          <dt>Staff ID</dt>
          <dd>{user.userId || user._id}</dd>
        </dl>
        <p className="muted">
          Contact your park manager if your staff details need to change.
        </p>
      </section>
    </>
  );
}
