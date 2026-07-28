import FootballManagerGame from '@/components/FootballManagerGame';
import styles from './seo-intro.module.css';

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: 'Gaffa',
    url: 'https://www.ballknw.com/gaffa/',
    description:
      'Free browser football management sim: pick a club, set formation and tactics, work the transfer market, and play a full league season with promotion and relegation across 240 clubs and 5,747 players.',
    applicationCategory: 'Game',
    genre: 'Sports Management',
    operatingSystem: 'Web Browser',
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'GBP',
    },
    publisher: {
      '@type': 'Organization',
      name: 'BALLKNW',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'BALLKNW',
        item: 'https://www.ballknw.com/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Gaffa',
        item: 'https://www.ballknw.com/gaffa/',
      },
    ],
  },
];

export default function Page() {
  return (
    <>
      <FootballManagerGame />
      <section className={styles.intro}>
        <h1>Gaffa — Football Manager Game</h1>
        <p>
          Gaffa is a free browser football management sim. Pick a club, set your formation and
          tactics, and work the transfer market to build a squad capable of winning silverware.
        </p>
        <p>
          Play through a full league season with promotion and relegation across a living
          football pyramid — 240 clubs and 5,747 players, all simulated in your browser.
        </p>
        <p>No download and no account needed — just pick a club and start managing.</p>
        <ul>
          <li>Full league season with promotion and relegation</li>
          <li>240 clubs and 5,747 players to manage or sign</li>
          <li>Formation, tactics and transfer market control</li>
          <li>Free to play, no account required</li>
        </ul>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
