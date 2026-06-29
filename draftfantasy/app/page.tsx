import Link from 'next/link';

export default function Home() {
  return (
    <div className="home">
      <span className="home__badge">DRAFT FANTASY</span>
      <h1 className="home__title">
        PERFECT <span className="home__title-accent">CUP</span>
      </h1>
      <p className="home__tagline">
        Draft five World Cup legends, simulate a tournament run, and try to win every match. Can you
        go 8-0 at the World Cup?
      </p>

      <Link href="/perfect/8-0" className="home__cta">
        Play Perfect Cup 8-0
      </Link>

      <div className="home__features">
        <div className="home__feature">
          <h3>Spin &amp; draft five</h3>
          <p>Each spin offers one World Cup squad. Pick one player per slot: 1 GK, 1 DEF, 2 MID, 1 FWD.</p>
        </div>
        <div className="home__feature">
          <h3>Two rerolls</h3>
          <p>Swap the edition (same country) or the squad (same year). One of each per game.</p>
        </div>
        <div className="home__feature">
          <h3>Win it all</h3>
          <p>Eight matches — group stage and knockouts. A perfect run wins every one. Runs save to Supabase, with offline fallback.</p>
        </div>
      </div>

      <p className="home__footer">
        Next.js 16 · Supabase · A Draft Fantasy clone of the Perfect Cup 8-0 mode.
      </p>
    </div>
  );
}
