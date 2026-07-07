/* FM2021 mobile-features add-on for Gaffer. Vanilla JS, localStorage only.
   Reads/writes the game's save slots (fmlite.save.*); add-on state lives in fm2021.extras.*
   Save mutations require a page reload to be picked up by the running game. */
(function () {
  'use strict';
  var SLOTS = ['fmlite.save.v1', 'fmlite.save.slot2', 'fmlite.save.slot3'];
  var slotKey = null, S = null, X = null, dirty = false;

  function loadSlot() {
    for (var i = 0; i < SLOTS.length; i++) {
      try {
        var raw = localStorage.getItem(SLOTS[i]);
        if (!raw) continue;
        var s = JSON.parse(raw);
        if (s && s.userClubId) { slotKey = SLOTS[i]; S = s; break; }
      } catch (e) {}
    }
    if (!slotKey) return false;
    try { X = JSON.parse(localStorage.getItem('fm2021.extras.' + slotKey) || '{}'); } catch (e) { X = {}; }
    X.vice = X.vice || null;
    X.talks = X.talks || {};            // playerId -> last week talked
    X.media = X.media || 0;             // last week media done
    X.setPieces = X.setPieces || { corners: null, freekicks: null, pens: null, att: 'mixed', def: 'zonal' };
    X.retrain = X.retrain || null;      // {id, role, doneWeek}
    X.loans = X.loans || [];            // {id, name, club, startWeek, notes:[]}
    X.friendlies = X.friendlies || [];  // {opp, gf, ga, week}
    X.agent = X.agent || {};            // playerId -> asking price revealed
    return true;
  }
  function saveAll() {
    if (dirty) { try { localStorage.setItem(slotKey, JSON.stringify(S)); } catch (e) {} }
    try { localStorage.setItem('fm2021.extras.' + slotKey, JSON.stringify(X)); } catch (e) {}
  }
  function clubName(id) { var c = (S.clubs || []).find(function (c) { return c.id === id; }); return c ? c.name : '—'; }
  function squad() {
    return Object.values(S.players).filter(function (p) { return p.clubId === S.userClubId && !p.onLoanUntil; })
      .sort(function (a, b) { return b.rating - a.rating; });
  }
  function money(v) { return '£' + (v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : Math.round(v / 1e3) + 'k'); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d; }
  function esc(s) { return String(s).replace(/[<>&"]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]; }); }

  /* ---------- tabs ---------- */
  var TABS = {
    Dynamics: tabDynamics, Talk: tabTalk, Tactics: tabTactics, 'Set Pieces': tabSetPieces,
    Analysis: tabAnalysis, Retrain: tabRetrain, Loans: tabLoans, Scouting: tabScouting,
    Friendlies: tabFriendlies, Review: tabReview
  };

  function tabDynamics(b) {
    var sq = squad();
    var tiers = { leaders: [], influential: [], core: [], youth: [] };
    sq.forEach(function (p) {
      var infl = p.rating + (p.age >= 28 ? 6 : p.age >= 24 ? 2 : p.age <= 20 ? -6 : 0) + (p.id === S.captainId ? 8 : 0);
      if (infl >= 84) tiers.leaders.push(p); else if (infl >= 76) tiers.influential.push(p);
      else if (p.age <= 20) tiers.youth.push(p); else tiers.core.push(p);
    });
    var h = '<div class="fm21-card"><h3>Squad Hierarchy</h3>';
    [['Team Leaders', 'leaders'], ['Highly Influential', 'influential'], ['Core Players', 'core'], ['Youngsters', 'youth']].forEach(function (t) {
      h += '<div class="fm21-row"><span>' + t[0] + '</span><span>' +
        (tiers[t[1]].map(function (p) { return '<span class="fm21-tag">' + esc(p.name) + '</span>'; }).join('') || '<span class="fm21-muted">none</span>') + '</span></div>';
    });
    h += '</div>';
    var opts = sq.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + ' (' + p.rating + ')</option>'; }).join('');
    h += '<div class="fm21-card"><h3>Captaincy</h3>' +
      '<div class="fm21-row"><span>Captain</span><select class="fm21-sel" id="fm21-cap"><option value="">— none —</option>' + opts + '</select></div>' +
      '<div class="fm21-row"><span>Vice-captain</span><select class="fm21-sel" id="fm21-vice"><option value="">— none —</option>' + opts + '</select></div>' +
      '<div style="margin-top:8px"><button class="fm21-btn pri" id="fm21-capset">Confirm</button></div></div>';
    // social groups: cluster by nationality (>=2) then age band
    var byNat = {};
    sq.forEach(function (p) { (byNat[p.nat] = byNat[p.nat] || []).push(p); });
    var groups = [];
    Object.keys(byNat).forEach(function (n) { if (byNat[n].length >= 2) groups.push({ name: n + ' contingent', ps: byNat[n] }); });
    var loners = sq.filter(function (p) { return !groups.some(function (g) { return g.ps.indexOf(p) >= 0; }); });
    if (loners.filter(function (p) { return p.age <= 21; }).length >= 2) groups.push({ name: 'Young guns', ps: loners.filter(function (p) { return p.age <= 21; }) });
    if (loners.filter(function (p) { return p.age >= 29; }).length >= 2) groups.push({ name: 'Old heads', ps: loners.filter(function (p) { return p.age >= 29; }) });
    h += '<div class="fm21-card"><h3>Social Groups</h3>' + (groups.map(function (g) {
      return '<div class="fm21-row"><span>' + esc(g.name) + '</span><span>' + g.ps.map(function (p) { return '<span class="fm21-tag">' + esc(p.name) + '</span>'; }).join('') + '</span></div>';
    }).join('') || '<span class="fm21-muted">No distinct groups.</span>') +
      '<div class="fm21-muted" style="margin-top:6px">Team chemistry: <b class="' + (S.chemistry >= 65 ? 'fm21-ok' : S.chemistry >= 45 ? 'fm21-warn' : 'fm21-bad') + '">' + S.chemistry + '</b> · Morale: <b>' + S.morale + '</b></div></div>';
    b.appendChild(el(h));
    b.querySelector('#fm21-cap').value = S.captainId || '';
    b.querySelector('#fm21-vice').value = X.vice || '';
    b.querySelector('#fm21-capset').onclick = function () {
      var c = b.querySelector('#fm21-cap').value, v = b.querySelector('#fm21-vice').value;
      S.captainId = c ? +c : null; X.vice = v ? +v : null; dirty = true; saveAll();
      toast('Armbands updated. Reload the page to apply in-game.');
    };
  }

  function tabTalk(b) {
    var sq = squad();
    var h = '<div class="fm21-note">One talk per player per week; reactions depend on form. Media once a week.</div>' +
      '<div class="fm21-card"><h3>Talk to Player</h3>' +
      '<select class="fm21-sel" id="fm21-tp" style="width:100%">' + sq.map(function (p) {
        return '<option value="' + p.id + '">' + esc(p.name) + ' — form ' + (p.form >= 1.05 ? 'hot' : p.form <= 0.95 ? 'cold' : 'ok') + '</option>';
      }).join('') + '</select><div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">' +
      '<button class="fm21-btn" data-t="praise">Praise form</button>' +
      '<button class="fm21-btn" data-t="criticise">Criticise form</button>' +
      '<button class="fm21-btn" data-t="assure">Assure of role</button></div>' +
      '<div id="fm21-tr" class="fm21-muted" style="margin-top:8px"></div></div>' +
      '<div class="fm21-card"><h3>Talk to Media</h3><div style="display:flex;gap:6px;flex-wrap:wrap">' +
      '<button class="fm21-btn" data-m="calm">Play down expectations</button>' +
      '<button class="fm21-btn" data-m="bold">Declare title ambitions</button></div>' +
      '<div id="fm21-mr" class="fm21-muted" style="margin-top:8px"></div></div>';
    b.appendChild(el(h));
    b.querySelectorAll('[data-t]').forEach(function (btn) {
      btn.onclick = function () {
        var p = S.players[b.querySelector('#fm21-tp').value], out = b.querySelector('#fm21-tr');
        if (X.talks[p.id] === S.week) { out.innerHTML = '<span class="fm21-warn">' + esc(p.name) + ' has already spoken to you this week.</span>'; return; }
        X.talks[p.id] = S.week; var t = btn.dataset.t, good;
        if (t === 'praise') { good = p.form >= 1.0; p.form = clamp(p.form + (good ? 0.03 : -0.02), 0.85, 1.15); }
        else if (t === 'criticise') { good = p.form <= 0.95; p.form = clamp(p.form + (good ? 0.04 : -0.04), 0.85, 1.15); S.morale = clamp(S.morale + (good ? 0 : -2), 30, 95); }
        else { good = true; p.form = clamp(p.form + 0.02, 0.85, 1.15); S.chemistry = clamp(S.chemistry + 1, 0, 100); }
        dirty = true; saveAll();
        out.innerHTML = good ? '<span class="fm21-ok">' + esc(p.name) + ' reacted well: “Appreciated, boss.”</span>'
          : '<span class="fm21-bad">' + esc(p.name) + ' didn’t take it well: “Not sure that was fair, gaffer.”</span>';
      };
    });
    b.querySelectorAll('[data-m]').forEach(function (btn) {
      btn.onclick = function () {
        var out = b.querySelector('#fm21-mr');
        if (X.media === S.week) { out.innerHTML = '<span class="fm21-warn">You have already faced the press this week.</span>'; return; }
        X.media = S.week;
        if (btn.dataset.m === 'calm') { S.fanConfidence = clamp(S.fanConfidence - 1, 0, 100); S.morale = clamp(S.morale + 2, 30, 95); out.innerHTML = '<span class="fm21-ok">Pressure eased — dressing room relaxes (+morale).</span>'; }
        else { S.fanConfidence = clamp(S.fanConfidence + 3, 0, 100); S.morale = clamp(S.morale - 1, 30, 95); out.innerHTML = '<span class="fm21-warn">Fans excited (+confidence) but the squad feels the pressure.</span>'; }
        dirty = true; saveAll();
      };
    });
  }

  var TEMPLATES = {
    'Gegenpress': { style: 'attacking', pressing: 'high', tempo: 'fast', width: 'standard' },
    'Tiki-Taka': { style: 'balanced', pressing: 'high', tempo: 'slow', width: 'narrow' },
    'Counter-Attack': { style: 'defensive', pressing: 'low', tempo: 'fast', width: 'wide' },
    'Wing Play': { style: 'attacking', pressing: 'mid', tempo: 'normal', width: 'wide' },
    'Park the Bus': { style: 'defensive', pressing: 'low', tempo: 'slow', width: 'narrow' }
  };
  function tabTactics(b) {
    var h = '<div class="fm21-note">Templates write straight into your tactics (style / pressing / tempo / width). Reload to apply.</div>';
    Object.keys(TEMPLATES).forEach(function (n) {
      var t = TEMPLATES[n];
      var cur = ['style', 'pressing', 'tempo', 'width'].every(function (k) { return S.tactics[k] === t[k]; });
      h += '<div class="fm21-card"><div class="fm21-row"><div><b>' + n + '</b><div class="fm21-muted">' + t.style + ' · press ' + t.pressing + ' · tempo ' + t.tempo + ' · ' + t.width + '</div></div>' +
        '<button class="fm21-btn' + (cur ? '' : ' pri') + '" data-tpl="' + n + '">' + (cur ? 'Active' : 'Use') + '</button></div></div>';
    });
    h += '<div class="fm21-card"><h3>Specialist roles</h3><div class="fm21-muted">Roaming Playmaker, Inverted Winger and 40+ roles are assigned per player on the Tactics screen (tactical role picker).</div></div>';
    b.appendChild(el(h));
    b.querySelectorAll('[data-tpl]').forEach(function (btn) {
      btn.onclick = function () { Object.assign(S.tactics, TEMPLATES[btn.dataset.tpl]); dirty = true; saveAll(); toast(btn.dataset.tpl + ' applied. Reload the page to take effect.'); render(); };
    });
  }

  function tabSetPieces(b) {
    var sq = squad();
    function pick(id, val) {
      return '<select class="fm21-sel" id="' + id + '"><option value="">— auto —</option>' + sq.map(function (p) {
        return '<option value="' + p.id + '"' + (val === p.id ? ' selected' : '') + '>' + esc(p.name) + ' (pas ' + p.pas + ', sho ' + p.sho + ')</option>';
      }).join('') + '</select>';
    }
    var sp = X.setPieces;
    var h = '<div class="fm21-card"><h3>Takers</h3>' +
      '<div class="fm21-row"><span>Corners</span>' + pick('fm21-sp-c', sp.corners) + '</div>' +
      '<div class="fm21-row"><span>Free kicks</span>' + pick('fm21-sp-f', sp.freekicks) + '</div>' +
      '<div class="fm21-row"><span>Penalties</span>' + pick('fm21-sp-p', sp.pens) + '</div></div>' +
      '<div class="fm21-card"><h3>Instructions</h3>' +
      '<div class="fm21-row"><span>Attacking corners</span><select class="fm21-sel" id="fm21-sp-a">' +
      ['mixed', 'near post', 'far post', 'edge of box'].map(function (o) { return '<option' + (sp.att === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></div>' +
      '<div class="fm21-row"><span>Defending</span><select class="fm21-sel" id="fm21-sp-d">' +
      ['zonal', 'man marking', 'hybrid'].map(function (o) { return '<option' + (sp.def === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></div>' +
      '<div style="margin-top:8px"><button class="fm21-btn pri" id="fm21-sp-save">Save routines</button></div></div>';
    b.appendChild(el(h));
    b.querySelector('#fm21-sp-save').onclick = function () {
      sp.corners = +b.querySelector('#fm21-sp-c').value || null;
      sp.freekicks = +b.querySelector('#fm21-sp-f').value || null;
      sp.pens = +b.querySelector('#fm21-sp-p').value || null;
      sp.att = b.querySelector('#fm21-sp-a').value; sp.def = b.querySelector('#fm21-sp-d').value;
      var best = sq[0];
      if (sp.pens && S.players[sp.pens] && S.players[sp.pens].sho >= (best ? best.sho - 5 : 0)) { S.chemistry = clamp(S.chemistry + 1, 0, 100); dirty = true; }
      saveAll(); toast('Set-piece routines saved.');
    };
  }

  function tabAnalysis(b) {
    var fx = (S.fixtures.d1 || []).concat(S.fixtures.d2 || [], S.fixtures.d3 || [])
      .filter(function (f) { return f.homeId === S.userClubId || f.awayId === S.userClubId; })
      .sort(function (a, b) { return a.round - b.round; });
    var next = fx.find(function (f) { return !f.played; });
    var last = fx.filter(function (f) { return f.played; }).pop();
    function avgR(cid) {
      var ps = Object.values(S.players).filter(function (p) { return p.clubId === cid; });
      return ps.length ? ps.reduce(function (a, p) { return a + p.rating; }, 0) / ps.length : 60;
    }
    var h = '';
    if (next) {
      var oppId = next.homeId === S.userClubId ? next.awayId : next.homeId;
      var us = avgR(S.userClubId), them = avgR(oppId), home = next.homeId === S.userClubId;
      var edge = us - them + (home ? 2 : -2);
      h += '<div class="fm21-card"><h3>Pre-match · vs ' + esc(clubName(oppId)) + (home ? ' (H)' : ' (A)') + '</h3>' +
        '<div class="fm21-row"><span>Squad strength</span><span>' + us.toFixed(1) + ' vs ' + them.toFixed(1) + '</span></div>' +
        '<div class="fm21-row"><span>Verdict</span><span class="' + (edge > 3 ? 'fm21-ok' : edge < -3 ? 'fm21-bad' : 'fm21-warn') + '">' +
        (edge > 3 ? 'Favourites — take the game to them' : edge < -3 ? 'Underdogs — stay compact, hit on the counter' : 'Even contest — control tempo') + '</span></div>' +
        '<div class="fm21-muted" style="margin-top:6px">Advice: ' + (edge < -3 ? 'defensive style, low press, fast tempo.' : edge > 3 ? 'attacking style, high press.' : 'balanced style, mid press.') + '</div></div>';
    }
    if (last) {
      var lo = last.homeId === S.userClubId ? last.awayId : last.homeId;
      var gf = last.homeId === S.userClubId ? last.homeGoals : last.awayGoals;
      var ga = last.homeId === S.userClubId ? last.awayGoals : last.homeGoals;
      // deterministic pseudo-xG from goals + fixture id
      var seed = (last.round * 31 + last.homeId * 7 + last.awayId) % 100 / 100;
      var xf = Math.max(0.2, gf + (seed - 0.5) * 1.4).toFixed(2);
      var xa = Math.max(0.2, ga + (0.5 - seed) * 1.2).toFixed(2);
      h += '<div class="fm21-card"><h3>Post-match · ' + gf + '–' + ga + ' vs ' + esc(clubName(lo)) + '</h3>' +
        '<div class="fm21-row"><span>xG</span><span>' + xf + ' – ' + xa + '</span></div>' +
        '<div class="fm21-muted" style="margin-top:6px">' + (gf > +xf ? 'Clinical finishing — you scored above expected.' : 'You created more than you scored — keep the chances coming.') + '</div></div>';
    }
    if (!h) h = '<div class="fm21-muted">No fixtures found for your club.</div>';
    b.appendChild(el(h));
  }

  function tabRetrain(b) {
    var sq = squad(), ROLES = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];
    var h = '';
    if (X.retrain) {
      var p = S.players[X.retrain.id];
      if (p && S.week >= X.retrain.doneWeek) {
        p.role = X.retrain.role;
        p.pos = X.retrain.role === 'GK' ? 'GK' : /CB|LB|RB/.test(X.retrain.role) ? 'DEF' : /ST|LW|RW/.test(X.retrain.role) ? 'FWD' : 'MID';
        dirty = true; var done = X.retrain; X.retrain = null; saveAll();
        h += '<div class="fm21-note fm21-ok">' + esc(p.name) + ' has completed retraining as a ' + done.role + '! Reload to apply.</div>';
      } else if (p) {
        h += '<div class="fm21-card"><h3>In progress</h3>' + esc(p.name) + ' → ' + X.retrain.role +
          '<div class="fm21-muted">Ready week ' + X.retrain.doneWeek + ' (now week ' + S.week + ')</div>' +
          '<div style="margin-top:8px"><button class="fm21-btn" id="fm21-rt-cancel">Cancel</button></div></div>';
      } else X.retrain = null;
    }
    if (!X.retrain) {
      h += '<div class="fm21-card"><h3>Retrain position</h3><div class="fm21-muted" style="margin-bottom:8px">Takes 6 weeks. Younger players adapt best.</div>' +
        '<select class="fm21-sel" id="fm21-rt-p" style="width:100%">' + sq.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + ' — ' + p.role + ', age ' + p.age + '</option>'; }).join('') + '</select>' +
        '<div style="margin-top:8px;display:flex;gap:8px"><select class="fm21-sel" id="fm21-rt-r">' + ROLES.map(function (r) { return '<option>' + r + '</option>'; }).join('') + '</select>' +
        '<button class="fm21-btn pri" id="fm21-rt-go">Start</button></div></div>';
    }
    b.appendChild(el(h));
    var go = b.querySelector('#fm21-rt-go');
    if (go) go.onclick = function () {
      var id = +b.querySelector('#fm21-rt-p').value, role = b.querySelector('#fm21-rt-r').value, p = S.players[id];
      if (p.role === role) { toast(p.name + ' already plays there.'); return; }
      X.retrain = { id: id, role: role, doneWeek: S.week + (p.age <= 23 ? 5 : 7) }; saveAll(); render();
    };
    var cn = b.querySelector('#fm21-rt-cancel');
    if (cn) cn.onclick = function () { X.retrain = null; saveAll(); render(); };
  }

  function tabLoans(b) {
    var sq = squad().filter(function (p) { return p.age <= 23 || p.rating < 70; });
    var feeders = (S.clubs || []).filter(function (c) { return c.id !== S.userClubId && c.division > (S.clubs.find(function (u) { return u.id === S.userClubId; }) || { division: 3 }).division; });
    if (!feeders.length) feeders = (S.clubs || []).filter(function (c) { return c.id !== S.userClubId; }).slice(0, 8);
    var h = '<div class="fm21-note">Loan a fringe youngster to a feeder club for the rest of the season. His wages come off your bill and he gains development.</div>';
    var out = Object.values(S.players).filter(function (p) { return p.clubId === S.userClubId && p.onLoanUntil; });
    if (out.length || X.loans.length) {
      h += '<div class="fm21-card"><h3>Out on loan</h3>' + X.loans.map(function (l) {
        var p = S.players[l.id]; if (!p) return '';
        var wks = Math.max(0, S.week - l.startWeek);
        var prog = wks >= 8 ? 'Excelling — first-team regular' : wks >= 4 ? 'Settling in, getting minutes' : 'Just arrived';
        return '<div class="fm21-row"><div><b>' + esc(p.name) + '</b> → ' + esc(l.club) + '<div class="fm21-muted">' + prog + ' (' + wks + ' wks)</div></div><span class="fm21-tag">until ' + p.onLoanUntil + '</span></div>';
      }).join('') + '</div>';
    }
    h += '<div class="fm21-card"><h3>Arrange loan</h3>' +
      '<select class="fm21-sel" id="fm21-ln-p" style="width:100%">' + (sq.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + ' (' + p.rating + ', age ' + p.age + ')</option>'; }).join('') || '<option value="">no candidates</option>') + '</select>' +
      '<div style="margin-top:8px;display:flex;gap:8px"><select class="fm21-sel" id="fm21-ln-c" style="flex:1">' + feeders.slice(0, 12).map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('') + '</select>' +
      '<button class="fm21-btn pri" id="fm21-ln-go">Loan out</button></div></div>';
    b.appendChild(el(h));
    b.querySelector('#fm21-ln-go').onclick = function () {
      var id = +b.querySelector('#fm21-ln-p').value; if (!id) return;
      var p = S.players[id], cid = +b.querySelector('#fm21-ln-c').value;
      p.onLoanUntil = S.seasonYear + 1;
      p.form = clamp(p.form + 0.05, 0.85, 1.15);
      X.loans.push({ id: id, club: clubName(cid), startWeek: S.week });
      dirty = true; saveAll(); toast(p.name + ' loaned to ' + clubName(cid) + '. Reload to apply.'); render();
    };
  }

  function tabScouting(b) {
    var lvl = (S.staff && S.staff.scout) || 0;
    var pool = Object.values(S.players).filter(function (p) { return p.clubId !== S.userClubId && !p.onLoanUntil; })
      .sort(function (a, b) { return (b.rating - b.age * 0.8) - (a.rating - a.age * 0.8); }).slice(0, 5 + lvl * 2);
    var h = '<div class="fm21-card"><h3>Recruitment meeting</h3><div class="fm21-muted" style="margin-bottom:6px">Your scouting team (level ' + lvl + ') recommends:</div>' +
      pool.slice(0, 5).map(function (p) {
        var asked = X.agent[p.id];
        return '<div class="fm21-row"><div><b>' + esc(p.name) + '</b> <span class="fm21-muted">' + p.role + ', ' + p.age + ', ' + (p.clubId ? esc(clubName(p.clubId)) : 'Free agent') + '</span>' +
          '<div class="fm21-muted">Rating ' + p.rating + ' · value ' + money(p.value) + (asked ? ' · <span class="fm21-warn">agent wants ' + money(asked) + '</span>' : '') + '</div></div>' +
          (asked ? '<span class="fm21-tag">approached</span>' : '<button class="fm21-btn" data-ag="' + p.id + '">Approach agent</button>') + '</div>';
      }).join('') + '</div>' +
      '<div class="fm21-note">Sign targets via the Transfers screen — agent asking prices give you a negotiating benchmark.</div>';
    b.appendChild(el(h));
    b.querySelectorAll('[data-ag]').forEach(function (btn) {
      btn.onclick = function () {
        var p = S.players[btn.dataset.ag];
        X.agent[p.id] = Math.round(p.value * (1.05 + ((p.id % 7) / 20)));
        saveAll(); render();
      };
    });
  }

  function tabFriendlies(b) {
    var opps = (S.clubs || []).filter(function (c) { return c.id !== S.userClubId; });
    var h = '<div class="fm21-note">Arrange a friendly any time — instant result, small fitness/morale benefit, no league impact.</div>';
    if (X.friendlies.length) {
      h += '<div class="fm21-card"><h3>Results</h3>' + X.friendlies.slice(-6).reverse().map(function (f) {
        return '<div class="fm21-row"><span>vs ' + esc(f.opp) + ' <span class="fm21-muted">(wk ' + f.week + ')</span></span><b class="' + (f.gf > f.ga ? 'fm21-ok' : f.gf < f.ga ? 'fm21-bad' : 'fm21-warn') + '">' + f.gf + '–' + f.ga + '</b></div>';
      }).join('') + '</div>';
    }
    h += '<div class="fm21-card"><h3>Arrange friendly</h3><div style="display:flex;gap:8px"><select class="fm21-sel" id="fm21-fr-c" style="flex:1">' +
      opps.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + ' (Div ' + c.division + ')</option>'; }).join('') +
      '</select><button class="fm21-btn pri" id="fm21-fr-go">Play</button></div><div id="fm21-fr-out" style="margin-top:8px"></div></div>';
    b.appendChild(el(h));
    b.querySelector('#fm21-fr-go').onclick = function () {
      var cid = +b.querySelector('#fm21-fr-c').value;
      function str(id) { var ps = Object.values(S.players).filter(function (p) { return p.clubId === id; }); return ps.length ? ps.reduce(function (a, p) { return a + p.rating; }, 0) / ps.length : 60; }
      var d = (str(S.userClubId) - str(cid)) / 10;
      function goals(adv) { var g = 0; for (var i = 0; i < 5; i++) if (Math.random() < 0.22 + adv * 0.06) g++; return g; }
      var gf = goals(d), ga = goals(-d);
      X.friendlies.push({ opp: clubName(cid), gf: gf, ga: ga, week: S.week });
      S.morale = clamp(S.morale + (gf > ga ? 2 : gf < ga ? -1 : 1), 30, 95);
      S.chemistry = clamp(S.chemistry + 1, 0, 100);
      dirty = true; saveAll();
      b.querySelector('#fm21-fr-out').innerHTML = '<b class="' + (gf > ga ? 'fm21-ok' : gf < ga ? 'fm21-bad' : 'fm21-warn') + '">Full time: ' + gf + '–' + ga + '</b> <span class="fm21-muted">+chemistry' + (gf >= ga ? ', +morale' : '') + '</span>';
      render();
    };
  }

  function tabReview(b) {
    var hist = S.history || [];
    var lastS = hist[hist.length - 1];
    var sq = squad();
    var top = sq.slice().sort(function (a, b) { return b.goals - a.goals; })[0];
    var best = sq.slice().sort(function (a, b) { return (b.seasonRatingSum / (b.seasonRatingCount || 1)) - (a.seasonRatingSum / (a.seasonRatingCount || 1)); })[0];
    var h = '<div class="fm21-card"><h3>Season ' + S.seasonYear + ' · week ' + S.week + '</h3>' +
      '<div class="fm21-row"><span>Manager record</span><span>' + S.manager.wins + 'W ' + S.manager.draws + 'D ' + S.manager.losses + 'L</span></div>' +
      (top ? '<div class="fm21-row"><span>Top scorer</span><span>' + esc(top.name) + ' (' + top.goals + ')</span></div>' : '') +
      (best && best.seasonRatingCount ? '<div class="fm21-row"><span>Player of the season</span><span>' + esc(best.name) + ' (' + (best.seasonRatingSum / best.seasonRatingCount).toFixed(2) + ')</span></div>' : '') +
      '<div class="fm21-row"><span>Budget</span><span>' + money(S.budget) + '</span></div>' +
      '<div class="fm21-row"><span>Fan confidence</span><span>' + S.fanConfidence + '/100</span></div></div>';
    if (lastS) {
      h += '<div class="fm21-card"><h3>Last season</h3><div class="fm21-muted">' +
        Object.keys(lastS).map(function (k) { var v = lastS[k]; return typeof v === 'object' ? '' : '<div class="fm21-row"><span>' + esc(k) + '</span><span>' + esc(v) + '</span></div>'; }).join('') + '</div></div>';
    }
    if (S.manager.trophies && S.manager.trophies.length) {
      h += '<div class="fm21-card"><h3>Trophy cabinet</h3>' + S.manager.trophies.map(function (t) { return '<span class="fm21-tag">🏆 ' + esc(typeof t === 'string' ? t : JSON.stringify(t)) + '</span>'; }).join('') + '</div>';
    }
    b.appendChild(el(h));
  }

  /* ---------- shell ---------- */
  var active = 'Dynamics';
  function render() {
    var body = document.getElementById('fm21-body');
    if (!body) return;
    body.innerHTML = '';
    if (!loadSlot()) { body.innerHTML = '<div class="fm21-note">No save found. Start a career first, then reopen FM+.</div>'; return; }
    dirty = false;
    TABS[active](body);
    document.querySelectorAll('#fm21-tabs button').forEach(function (t) { t.classList.toggle('act', t.textContent === active); });
  }
  function toast(msg) {
    var t = el('<div style="position:fixed;left:50%;bottom:70px;transform:translateX(-50%);background:#fafafa;color:#09090b;padding:8px 14px;border-radius:8px;font:600 13px system-ui;z-index:10001">' + esc(msg) + '</div>').firstChild;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600);
  }
  function boot() {
    var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/football-manager/fm2021.css'; document.head.appendChild(css);
    var fab = el('<button id="fm21-fab">⚽ FM+</button>').firstChild;
    var panel = el('<div id="fm21-panel"><div id="fm21-sheet"><div id="fm21-head"><h2>FM+ Manager Tools</h2><button id="fm21-close">✕</button></div><div id="fm21-tabs">' +
      Object.keys(TABS).map(function (t) { return '<button>' + t + '</button>'; }).join('') + '</div><div id="fm21-body"></div></div></div>').firstChild;
    document.body.appendChild(fab); document.body.appendChild(panel);
    fab.onclick = function () { panel.classList.add('open'); render(); };
    panel.querySelector('#fm21-close').onclick = function () { panel.classList.remove('open'); };
    panel.onclick = function (e) { if (e.target === panel) panel.classList.remove('open'); };
    panel.querySelectorAll('#fm21-tabs button').forEach(function (t) { t.onclick = function () { active = t.textContent; render(); }; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
