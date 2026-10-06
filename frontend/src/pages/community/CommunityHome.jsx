import { Link } from 'react-router-dom';
import { ArrowUpRight, MapPin, ShieldCheck, Users } from 'lucide-react';
export default function CommunityHome() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">PEOPLE & WILDLIFE, TOGETHER</p>
          <h1>
            A safer place
            <br />
            for every <em>footprint.</em>
          </h1>
          <p>
            Your observations help conservation teams understand elephant
            movement and respond where it matters.
          </p>
          <Link className="button light" to="/report">
            Report Elephant Sighting <ArrowUpRight size={19} />
          </Link>
          <span className="hero-note">
            No account needed · A few minutes can make a difference
          </span>
        </div>
        <div className="landscape" aria-hidden="true">
          <div className="sun" />
          <div className="hill hill-back" />
          <div className="hill hill-front" />
          <div className="landscape-label">
            <MapPin size={16} /> Yala National Park, Sri Lanka
          </div>
        </div>
      </section>
      <section className="public-intro">
        <p className="eyebrow">A SHARED RESPONSIBILITY</p>
        <h2>Small observations. Meaningful protection.</h2>
        <div className="three-grid">
          <article className="panel">
            <MapPin />
            <h3>Share what you see</h3>
            <p>
              Tell us the nearest landmark, herd size and direction of movement.
            </p>
          </article>
          <article className="panel">
            <Users />
            <h3>Connect with field teams</h3>
            <p>
              Reports reach park managers and community liaison officers in one
              workspace.
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
