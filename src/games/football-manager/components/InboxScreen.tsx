'use client';

import { useState, type CSSProperties } from 'react';
import type { GameState, InboxCategory, InboxItem, Player } from '@/engine/types';
import { markAllInboxRead, markInboxRead, setCaptain } from '@/engine/seasonProgression';
import { respondToComplaint } from '@/engine/transferMarket';
import { formatMoney } from '@/engine/utils';
import { tint } from './visuals';
import { Icon, type IconName } from './Icon';

const CATEGORY_ICON: Record<InboxCategory, IconName> = {
  club: 'stadium',
  transfer: 'transfers',
  injury: 'injury',
  contract: 'document',
  youth: 'sprout',
  board: 'target',
  match: 'trophy',
  press: 'mic',
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

/** Icon-tile tint per category (mock: colour-coded message rows), drawn only
 *  from the existing token set — the spec's purple is not part of this
 *  game's palette, so board/press take gold and emerald instead. */
const CATEGORY_TINT: Record<InboxCategory, string> = {
  club: 'var(--green)',
  transfer: 'var(--blue)',
  injury: 'var(--red)',
  contract: 'var(--gold)',
  youth: 'var(--green-600)',
  board: 'var(--gold-2)',
  match: 'var(--lime)',
  press: 'var(--emerald)',
};

/** List filter: everything, unread only, or a single category. Only
 *  categories that actually have messages become tabs — an empty "Youth"
 *  filter would read as a broken screen rather than an empty inbox. */
type Filter = 'all' | 'unread' | InboxCategory;

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
        <Icon name="person" size={32} className="fm-newscard__silhouette" />
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
        <span className="fm-newscard__star"><Icon name="star" size={13} /> {(p.rating / 10).toFixed(2)}</span>
        <span className="fm-newscard__stat"><Icon name="net" size={13} /> {p.goals}</span>
        <span className="fm-newscard__stat"><Icon name="boot" size={13} /> {p.apps}</span>
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
  const [filter, setFilter] = useState<Filter>('all');
  const items = state.inbox;
  const unread = items.filter((i) => !i.read).length;

  // Categories present in the real inbox, in the order the label map
  // declares them so the strip doesn't reshuffle as news arrives.
  const presentCategories = (Object.keys(CATEGORY_LABEL) as InboxCategory[]).filter((c) =>
    items.some((i) => i.category === c)
  );
  const shown = items.filter((i) =>
    filter === 'all' ? true : filter === 'unread' ? !i.read : i.category === filter
  );

  // Prev/Next walk the list you opened the message *from*, captured at open
  // time rather than recomputed. Reading a message under the "Unread" filter
  // drops it out of the live filtered list, which would otherwise strand the
  // detail view the instant it marked itself read.
  const [navIds, setNavIds] = useState<number[]>([]);
  const current = openId !== null ? items.find((i) => i.id === openId) ?? null : null;
  const navIndex = openId !== null ? navIds.indexOf(openId) : -1;

  const openItem = (id: number, from?: number[]) => {
    setOpenId(id);
    if (from) setNavIds(from);
    const item = items.find((i) => i.id === id);
    if (item && !item.read) onChange(markInboxRead(state, id));
  };

  const step = (dir: 1 | -1) => {
    if (navIndex < 0) return;
    const next = navIds[navIndex + dir];
    if (next !== undefined) openItem(next);
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
          <>
            <div className="fm-subnav__tabs" role="tablist" aria-label="Filter messages">
              {([
                { id: 'all' as Filter, label: 'All', count: items.length },
                { id: 'unread' as Filter, label: 'Unread', count: unread },
                ...presentCategories.map((c) => ({
                  id: c as Filter,
                  label: CATEGORY_LABEL[c],
                  count: items.filter((i) => i.category === c).length,
                })),
              ]).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  id={`fm-inbox-tab-${t.id}`}
                  role="tab"
                  aria-selected={filter === t.id}
                  aria-controls="fm-inbox-panel"
                  className={`fm-subtab${filter === t.id ? ' active' : ''}`}
                  onClick={() => setFilter(t.id)}
                >
                  <span className="fm-subtab__label">{t.label}{t.count > 0 ? ` (${t.count})` : ''}</span>
                </button>
              ))}
            </div>

            <div id="fm-inbox-panel" role="tabpanel" aria-labelledby={`fm-inbox-tab-${filter}`}>
              {shown.length === 0 ? (
                <p className="fm-hint">
                  {filter === 'unread' ? 'Everything here is read.' : 'No messages in this category.'}
                </p>
              ) : (
                <div className="fm-msg-list">
                  {shown.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`fm-msg-row${item.read ? '' : ' unread'}`}
                      onClick={() => openItem(item.id, shown.map((i) => i.id))}
                    >
                      <span
                        className="fm-icon-tile fm-icon-tile--sm"
                        style={{ '--tile-tint': CATEGORY_TINT[item.category] } as CSSProperties}
                      >
                        <Icon name={CATEGORY_ICON[item.category]} size={15} />
                      </span>
                      <span className="fm-msg-row__main">
                        <span className="fm-msg-row__title">{item.title}</span>
                        <span className="fm-msg-row__meta">{CATEGORY_LABEL[item.category]} · Week {item.week}</span>
                      </span>
                      {!item.read && (
                        <span className="fm-msg-row__dot">
                          <span className="fm-u-sr">Unread</span>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  const player = current.playerId != null ? state.players[current.playerId] : null;
  const playerClub = player ? state.clubs.find((c) => c.id === player.clubId) : undefined;
  const isCaptaincy = current.category === 'club' && /captain/i.test(current.title);
  const isComplaint = current.category === 'club' && /playing time|complain/i.test(current.title);

  const respond = (response: 'reassure' | 'promise') => {
    if (!player) return;
    const next = respondToComplaint(state, player.id, response);
    next.inbox = next.inbox.map((i) => (i.id === current.id ? { ...i, responded: true } : i));
    onChange(next);
  };

  return (
    <div className="fm-inbox">
      <div className="fm-inbox__article-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span
            className="fm-icon-tile fm-icon-tile--sm"
            style={{ '--tile-tint': CATEGORY_TINT[current.category] } as CSSProperties}
          >
            <Icon name={CATEGORY_ICON[current.category]} size={15} />
          </span>
          <span style={{ minWidth: 0 }}>
            <span className="fm-inbox__cat-chip">{CATEGORY_LABEL[current.category]}</span>
            <span className="fm-inbox__date">{articleDate(current)}</span>
          </span>
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
        {isComplaint && player && !current.responded && (
          <>
            <button className="fm-btn fm-btn--ghost fm-btn--small" onClick={() => respond('reassure')} title="Small, always-available morale bump.">
              Reassure
            </button>
            <button className="fm-btn fm-btn--secondary fm-btn--small" onClick={() => respond('promise')} title="Bigger morale bump, but promises him more game time — breaking it later will hurt.">
              Promise change
            </button>
          </>
        )}
        {isComplaint && current.responded && (
          <span className="fm-hint" style={{ textAlign: 'left', margin: 0 }}>You've already responded to this.</span>
        )}
        <span className="fm-inbox__nav-spacer" />
        <button className="fm-btn fm-btn--ghost fm-btn--small" onClick={() => setOpenId(null)}>
          Inbox
        </button>
        <button className="fm-btn fm-btn--ghost fm-btn--small" onClick={() => step(-1)} disabled={navIndex <= 0}>
          <Icon name="chevron" size={13} style={{ transform: 'rotate(180deg)' }} /> Previous
        </button>
        <button className="fm-btn fm-btn--ghost fm-btn--small" onClick={() => step(1)} disabled={navIndex < 0 || navIndex >= navIds.length - 1}>
          Next <Icon name="chevron" size={13} />
        </button>
      </div>
    </div>
  );
}
