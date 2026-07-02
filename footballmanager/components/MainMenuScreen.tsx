'use client';

export default function MainMenuScreen({
  hasSave,
  onContinue,
  onNewGame,
}: {
  hasSave: boolean;
  onContinue: () => void;
  onNewGame: () => void;
}) {
  return (
    <div className="fm-screen fm-start">
      <p className="fm-label">A BALLKNW GAME</p>
      <h1 className="fm-start__title">
        Football <span className="fm-start__accent">Manager</span>
      </h1>
      <p className="fm-start__tagline">
        Take charge of a club. Pick your XI, work the transfer market, and manage your way through a
        full league season — can you win the title?
      </p>

      {hasSave && (
        <button className="fm-btn fm-btn--primary fm-btn--large" onClick={onContinue}>
          Continue Career
        </button>
      )}
      <button
        className={`fm-btn ${hasSave ? 'fm-btn--secondary' : 'fm-btn--primary'} fm-btn--large`}
        onClick={onNewGame}
      >
        {hasSave ? 'Start New Career' : 'Start Your Career'}
      </button>

      <ol className="fm-howto">
        <li className="fm-howto__step">
          <span className="fm-howto__num">1</span>
          <div>
            <h3>Choose your club</h3>
            <p>40 clubs across two divisions. Take a title contender or rebuild a struggler from the bottom up.</p>
          </div>
        </li>
        <li className="fm-howto__step">
          <span className="fm-howto__num">2</span>
          <div>
            <h3>Set up your team</h3>
            <p>Pick a formation, choose your starting XI and set the tactics — real players, real ratings.</p>
          </div>
        </li>
        <li className="fm-howto__step">
          <span className="fm-howto__num">3</span>
          <div>
            <h3>Work the market</h3>
            <p>Buy and sell with a limited budget. Big clubs will bid for your stars — cash in or hold firm.</p>
          </div>
        </li>
        <li className="fm-howto__step">
          <span className="fm-howto__num">4</span>
          <div>
            <h3>Climb the table</h3>
            <p>38 rounds, promotion and relegation, injuries and form. Every season your squad ages and evolves.</p>
          </div>
        </li>
      </ol>
    </div>
  );
}
