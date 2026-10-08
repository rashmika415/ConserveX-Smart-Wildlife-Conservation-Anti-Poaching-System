import { Link } from 'react-router-dom';
export default function NotFound() {
  return (
    <section className="confirmation panel">
      <p className="eyebrow">404 · PAGE NOT FOUND</p>
      <h1>This trail ends here.</h1>
      <p>The page may have moved, or the address may be incorrect.</p>
      <Link className="button" to="/">
        Return home
      </Link>
    </section>
  );
}
