'use client';

/**
 * Crest & kit sheet — a dev-facing contact sheet for every club in the game.
 *
 * It exists so crest and colour changes can be eyeballed across all ~490 clubs
 * at once: the templates have to stay distinguishable at 16px (a fixture list)
 * as well as 64px (a club page), and a palette change that ruins one league
 * while fixing another is otherwise easy to miss.
 *
 * Not linked from the game. Visit /crests.
 */

import { useEffect, useMemo, useState } from 'react';
import type { GameData } from '@/engine/types';
import { loadGameData } from '@/lib/gamedata';
import { leagueIdForDivision, leagueName } from '@/engine/gameRules';
import { clubKit, hasCuratedKit, matchKits } from '@/lib/clubColors';
import { Crest } from '@/components/Crest';

export default function CrestSheetPage() {
  const [data, setData] = useState<GameData | null>(null);
  const [onlyDerived, setOnlyDerived] = useState(false);

  useEffect(() => {
    loadGameData().then(setData).catch(() => setData(null));
  }, []);

  const groups = useMemo(() => {
    if (!data) return [];
    const byLeague = new Map<string, typeof data.clubs>();
    for (const club of data.clubs) {
      if (onlyDerived && hasCuratedKit(club.name)) continue;
      const id = leagueIdForDivision(club.division);
      const list = byLeague.get(id) ?? [];
      list.push(club);
      byLeague.set(id, list);
    }
    return [...byLeague.entries()];
  }, [data, onlyDerived]);

  // A worked clash example, since that is the part people ask about first.
  const clashDemo = useMemo(() => {
    if (!data) return null;
    const home = data.clubs.find((c) => c.name === 'Arsenal');
    const away = data.clubs.find((c) => c.name === 'Wrexham');
    if (!home || !away) return null;
    return { home, away, kits: matchKits(home.name, away.name) };
  }, [data]);

  if (!data) return <main style={{ padding: 24 }}>Loading club data…</main>;

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 4 }}>Crest &amp; kit sheet</h1>
      <p style={{ opacity: 0.7, marginTop: 0 }}>
        Every crest is original geometry coloured from the club&apos;s kit — no club&apos;s
        actual badge is reproduced. {data.clubs.length} clubs.
      </p>

      <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', margin: '12px 0 24px' }}>
        <input type="checkbox" checked={onlyDerived} onChange={(e) => setOnlyDerived(e.target.checked)} />
        Show only clubs on derived (non-hand-authored) kits
      </label>

      {clashDemo && (
        <section
          style={{
            border: '1px solid rgba(128,128,128,0.35)',
            borderRadius: 10,
            padding: 16,
            marginBottom: 28,
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Kit clash</h2>
          <p style={{ opacity: 0.75, fontSize: 13, marginTop: 0 }}>
            Both sides are red, so the away side changes — same rule as the real game.
          </p>
          <div style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
            <Swatch label={`${clashDemo.home.name} (home)`} color={clashDemo.kits.home} />
            <Swatch
              label={`${clashDemo.away.name} (away${clashDemo.kits.awayChanged ? ', changed' : ''})`}
              color={clashDemo.kits.away}
            />
            <Swatch label={`${clashDemo.away.name} first choice`} color={clubKit(clashDemo.away.name).primary} />
          </div>
        </section>
      )}

      {groups.map(([leagueId, clubs]) => (
        <section key={leagueId} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, borderBottom: '1px solid rgba(128,128,128,0.3)', paddingBottom: 6 }}>
            {leagueName(leagueId)} <span style={{ opacity: 0.5, fontWeight: 400 }}>({clubs.length})</span>
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: 16,
            }}
          >
            {clubs.map((club) => {
              const kit = clubKit(club.name);
              return (
                <div key={club.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Crest name={club.name} code={club.code} size={44} />
                  {/* The 16px rendering is the one that has to survive — it is
                      what a fixture list and a league table actually show. */}
                  <Crest name={club.name} code={club.code} size={16} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {club.name}
                    </div>
                    <div style={{ display: 'flex', gap: 3, marginTop: 3 }}>
                      <Chip color={kit.primary} />
                      <Chip color={kit.secondary} />
                      {!hasCuratedKit(club.name) && (
                        <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 2 }}>derived</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}

function Chip({ color }: { color: string }) {
  return (
    <span
      style={{
        width: 14,
        height: 14,
        borderRadius: 3,
        background: color,
        border: '1px solid rgba(128,128,128,0.5)',
        display: 'inline-block',
      }}
      title={color}
    />
  );
}

function Swatch({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: 8,
          background: color,
          border: '1px solid rgba(128,128,128,0.5)',
        }}
      />
      <div style={{ fontSize: 11, marginTop: 6, opacity: 0.8 }}>{label}</div>
      <code style={{ fontSize: 10, opacity: 0.55 }}>{color}</code>
    </div>
  );
}
