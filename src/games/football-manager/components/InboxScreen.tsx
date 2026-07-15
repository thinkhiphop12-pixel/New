'use client';

import { useState } from 'react';
import type { GameState, InboxCategory, InboxItem, Player } from '@/engine/types';
import { markAllInboxRead, markInboxRead, setCaptain } from '@/engine/seasonProgression';
import { formatMoney } from '@/engine/utils';
import { tint } from './visuals';

const CATEGORY_ICON: Record<InboxCategory, string> = {
  club: '🏟️',
  transfer: '💰',
  injury: '🚑',
  contract: '📄',
  youth: '🌱',
  board: '🎯',
  match: '🏆',
  press: '🎙️',
};

const CATEGORY_LABEL: Record<InboxCategory, string> = {
  club: 'Club',
  transfer: 'Transfer',
  injury: 'Injury',
  contract: 'Contract',
  youth: 'Youth',
  board: 'Board',
  match: 'Match',
  press: 'Press',
};

function ord(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Deterministic pseudo-date within a season week, purely cosmetic. */
function articleDate(item: InboxItem): string {
  const dayOfYear = (item.week * 6 + item.id) % 365;
  const month = MONTHS[Math.floor(dayOfYear / 30.4) % 12];
  const day = 1 + (dayOfYear % 28);
  return `${day}${ord(day)} ${month} ${item.seasonYear}`;
}

/** Gold FM-style player card: portrait silhouette, nation, club crest and
 *  the usual DOB/age/value/wage/contract rows plus a star rating strip. */
function PlayerCard({ p, club, seasonYear }: { p: Player; club: { name: string; color: string } | undefined; seasonYear: number }) {
  const dobYear = seasonYear - p.age;
  const contractExpiry = p.clubId === 0 ? 'Free agent' : `30/6/${seasonYear + Math.max(0, p.contractYears)}`;
  return (
    <div className="fm-newscard">
      <div className="fm-newscard__top">
        <span className="fm-newscard__pos">{p.pos}</span>
        <span className="fm-newscard__nat">{p.nat}</span>
      </div>
      <div className="fm-newscard__portrait">
        <span className="fm-newscard__silhouette">👤</span>
      </div>
      <div className="fm-newscard__crests">
        <span className="fm-newscard__crest" style={{ background: club?.color ?? '#555' }}>
          {club ? club.name.slice(0, 3).toUpperCase() : p.clubId === 0 ? 'FA' : '—'}
        </span>
      </div>
      <div className="fm-newscard__name">{p.name}</div>
      <div className="fm-newscard__role">
        {p.age <= 21 ? 'Promising' : p.age >= 32 ? 'Experienced' : 'Established'} {p.role}
      </div>
      <div className="fm-newscard__rows">
        <div className="fm-newscard__row"><span>Date of Birth</span><strong>1 Jan {dobYear}</strong></div>
        <div className="fm-newscard__row"><span>Age</span><strong>{p.age}</strong></div>
        <div className="fm-newscard__row"><span>Value</span><strong>{formatMoney(p.value)}</strong></div>
        <div className="fm-newscard__row"><span>Wage</span><strong>{formatMoney(p.wage)}</strong></div>
        <div className="fm-newscard__row"><span>Contract Expiry</span><strong>{contractExpiry}</strong></div>
      </div>
      <div className="fm-newscard__foot">
        <span className="fm-newscard__star">⭐ {(p.rating / 10).toFixed(2)}</span>
        <span className="fm-newscard__stat">🥅 {p.goals}</span>
        <span className="fm-newscard__stat">👟 {p.apps}</span>
      </div>
    </div>
  );
}

export default function InboxScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const [openId, setOpenId] = useState<number | null>(null);
  const items = state.inbox;
  const unread = items.filter((i) => !i.read).length;

  const openIndex = openId !== null ? items.findIndex((i) => i.id === openId) : -1;
  const current = openIndex >= 0 ? items[openIndex] : null;

  const openItem = (id: number) => {
    setOpenId(id);
    const item = items.find((i) => i.id === id);
    if (item && !item.read) onChange(markInboxRead(state, id));
  };

  const step = (dir: 1 | -1) => {
    if (openIndex < 0) return;
    const next = items[openIndex + dir];
    if (next) openItem(next.id);
  };

  if (!current) {
    return (
      <div className="fm-inbox">
        <div className="fm-inbox__head">
          <div>
            <p className="fm-label" style={{ margin: 0 }}>Inbox</p>
            <p className="fm-hint" style={{ margin: 0, textAlign: 'left' }}>
              {unread > 0 ? `${unread} unread message${unread === 1 ? '' : 's'}` : 'No unread news items'}
            </p>
          </div>
          {unread > 0 && (
            <button className="fm-btn fm-btn--secondary fm-btn--small" onClick={() => onChange(markAllInboxRead(state))}>
              Mark all read
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <p className="fm-hint">Nothing here yet — news will arrive as your season unfolds.</p>
        ) : (
          <div className="fm-inbox__list">
            {items.map((item) => (
              <button key={item.id} className={`fm-inbox__row${item.read ? '' : ' unread'}`} onClick={() => openItem(item.id)}>
                <span className="fm-inbox__row-icon">{CATEGORY_ICON[item.category]}</span>
                <span className="fm-inbox__row-main">
                  <span className="fm-inbox__row-title">{item.title}</span>
                  <span className="fm-inbox__row-meta">{CATEGORY_LABEL[item.category]} · Week {item.week}</span>
                </span>
                {!item.read && <span className="fm-inbox__row-dot" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const player = current.playerId != null ? state.players[current.playerId] : null;
  const playerClub = player ? state.clubs.find((c) => c.id === player.clubId) : undefined;
  const isCaptaincy = current.category === 'club' && /captain/i.test(current.title);

  return (
    <div className="fm-inbox">
      <div className="fm-inbox__article-head">
        <div>
          <span className="fm-inbox__cat-chip">{CATEGORY_ICON[current.category]} {CATEGORY_LABEL[current.category]}</span>
          <span className="fm-inbox__date">{articleDate(current)}</span>
        </div>
        <button className="fm-btn fm-btn--primary fm-btn--small" onClick={() => setOpenId(null)}>
          Continue
        </button>
      </div>

      <div className="fm-inbox__article-body">
        <div className="fm-inbox__article-main">
          <h2 className="fm-inbox__headline">{current.title.toUpperCase()}</h2>
          {current.body.split('\n\n').map((para, i) => (
            <p key={i} className="fm-inbox__para">{para}</p>
          ))}
          <div className="fm-inbox__chips">
            {playerClub && (
              <span className="fm-pill" style={{ background: tint(playerClub.color, '22'), borderColor: tint(playerClub.color, '55') }}>
                {playerClub.name}
              </span>
            )}
            {player && <span className="fm-pill">{player.name}</span>}
          </div>
        </div>
        {player && (
          <div className="fm-inbox__article-card">
            <PlayerCard p={player} club={playerClub} seasonYear={state.seasonYear} />
          </div>
        )}
      </div>

      <div className="fm-inbox__nav">
        {isCaptaincy && player && state.captainId !== player.id && (
          <button className="fm-btn fm-btn--secondary" onClick={() => onChange(setCaptain(state, player.id))}>
            Confirm captaincy
          </button>
        )}
        <span className="fm-inbox__nav-spacer" />
        <button className="fm-btn fm-btn--ghost fm-btn--small" onClick={() => setOpenId(null)}>
          Inbox
        </button>
        <button className="fm-btn fm-btn--ghost fm-btn--small" onClick={() => step(-1)} disabled={openIndex <= 0}>
          ◀ Previous
        </button>
        <button className="fm-btn fm-btn--ghost fm-btn--small" onClick={() => step(1)} disabled={openIndex >= items.length - 1}>
          Next ▶
        </button>
      </div>
    </div>
  );
}
