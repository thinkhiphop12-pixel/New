import dynamic from 'next/dynamic';

const FootballManagerGame = dynamic(
  () => import('@/games/football-manager/components/FootballManagerGame'),
  { ssr: false, loading: () => <div className="fm-loading"><div className="fm-spinner" /><p className="fm-hint">Loading GAFFA…</p></div> }
);

export default function Home() {
  return <FootballManagerGame />;
}
