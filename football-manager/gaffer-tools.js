/* Manager tools add-on for Gaffer. Vanilla JS, localStorage only.
   Reads/writes the game's save slots (fmlite.save.*); add-on state lives in gaffer-tools.extras.*
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
    try { X = JSON.parse(localStorage.getItem('gaffer.tools.extras.' + slotKey) || '{}'); } catch (e) { X = {}; }
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
    try { localStorage.setItem('gaffer.tools.extras.' + slotKey, JSON.stringify(X)); } catch (e) {}
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
    Dynamics: tabDynamics, Talk: tabTalk, Tactics: tabTactics, Training: tabTraining, 'Set Pieces': tabSetPieces,
    Analysis: tabAnalysis, Retrain: tabRetrain, Staff: tabStaff, Loans: tabLoans, Scouting: tabScouting,
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
    var h = '<div class="gt-card"><h3>Squad Hierarchy</h3>';
    [['Team Leaders', 'leaders'], ['Highly Influential', 'influential'], ['Core Players', 'core'], ['Youngsters', 'youth']].forEach(function (t) {
      h += '<div class="gt-row"><span>' + t[0] + '</span><span>' +
        (tiers[t[1]].map(function (p) { return '<span class="gt-tag">' + esc(p.name) + '</span>'; }).join('') || '<span class="gt-muted">none</span>') + '</span></div>';
    });
    h += '</div>';
    var opts = sq.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + ' (' + p.rating + ')</option>'; }).join('');
    h += '<div class="gt-card"><h3>Captaincy</h3>' +
      '<div class="gt-row"><span>Captain</span><select class="gt-sel" id="gt-cap"><option value="">— none —</option>' + opts + '</select></div>' +
      '<div class="gt-row"><span>Vice-captain</span><select class="gt-sel" id="gt-vice"><option value="">— none —</option>' + opts + '</select></div>' +
      '<div style="margin-top:8px"><button class="gt-btn pri" id="gt-capset">Confirm</button></div></div>';
    // social groups: cluster by nationality (>=2) then age band
    var byNat = {};
    sq.forEach(function (p) { (byNat[p.nat] = byNat[p.nat] || []).push(p); });
    var groups = [];
    Object.keys(byNat).forEach(function (n) { if (byNat[n].length >= 2) groups.push({ name: n + ' contingent', ps: byNat[n] }); });
    var loners = sq.filter(function (p) { return !groups.some(function (g) { return g.ps.indexOf(p) >= 0; }); });
    if (loners.filter(function (p) { return p.age <= 21; }).length >= 2) groups.push({ name: 'Young guns', ps: loners.filter(function (p) { return p.age <= 21; }) });
    if (loners.filter(function (p) { return p.age >= 29; }).length >= 2) groups.push({ name: 'Old heads', ps: loners.filter(function (p) { return p.age >= 29; }) });
    h += '<div class="gt-card"><h3>Social Groups</h3>' + (groups.map(function (g) {
      return '<div class="gt-row"><span>' + esc(g.name) + '</span><span>' + g.ps.map(function (p) { return '<span class="gt-tag">' + esc(p.name) + '</span>'; }).join('') + '</span></div>';
    }).join('') || '<span class="gt-muted">No distinct groups.</span>') +
      '<div class="gt-muted" style="margin-top:6px">Team chemistry: <b class="' + (S.chemistry >= 65 ? 'gt-ok' : S.chemistry >= 45 ? 'gt-warn' : 'gt-bad') + '">' + S.chemistry + '</b> · Morale: <b>' + S.morale + '</b></div></div>';
    b.appendChild(el(h));
    b.querySelector('#gt-cap').value = S.captainId || '';
    b.querySelector('#gt-vice').value = X.vice || '';
    b.querySelector('#gt-capset').onclick = function () {
      var c = b.querySelector('#gt-cap').value, v = b.querySelector('#gt-vice').value;
      S.captainId = c ? +c : null; X.vice = v ? +v : null; dirty = true; saveAll();
      toast('Armbands updated. Reload the page to apply in-game.');
    };
  }

  function tabTalk(b) {
    var sq = squad();
    var h = '<div class="gt-note">One talk per player per week; reactions depend on form. Media once a week.</div>' +
      '<div class="gt-card"><h3>Talk to Player</h3>' +
      '<select class="gt-sel" id="gt-tp" style="width:100%">' + sq.map(function (p) {
        return '<option value="' + p.id + '">' + esc(p.name) + ' — form ' + (p.form >= 1.05 ? 'hot' : p.form <= 0.95 ? 'cold' : 'ok') + '</option>';
      }).join('') + '</select><div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">' +
      '<button class="gt-btn" data-t="praise">Praise form</button>' +
      '<button class="gt-btn" data-t="criticise">Criticise form</button>' +
      '<button class="gt-btn" data-t="assure">Assure of role</button></div>' +
      '<div id="gt-tr" class="gt-muted" style="margin-top:8px"></div></div>' +
      '<div class="gt-card"><h3>Talk to Media</h3><div style="display:flex;gap:6px;flex-wrap:wrap">' +
      '<button class="gt-btn" data-m="calm">Play down expectations</button>' +
      '<button class="gt-btn" data-m="bold">Declare title ambitions</button></div>' +
      '<div id="gt-mr" class="gt-muted" style="margin-top:8px"></div></div>';
    b.appendChild(el(h));
    b.querySelectorAll('[data-t]').forEach(function (btn) {
      btn.onclick = function () {
        var p = S.players[b.querySelector('#gt-tp').value], out = b.querySelector('#gt-tr');
        if (X.talks[p.id] === S.week) { out.innerHTML = '<span class="gt-warn">' + esc(p.name) + ' has already spoken to you this week.</span>'; return; }
        X.talks[p.id] = S.week; var t = btn.dataset.t, good;
        if (t === 'praise') { good = p.form >= 1.0; p.form = clamp(p.form + (good ? 0.03 : -0.02), 0.85, 1.15); }
        else if (t === 'criticise') { good = p.form <= 0.95; p.form = clamp(p.form + (good ? 0.04 : -0.04), 0.85, 1.15); S.morale = clamp(S.morale + (good ? 0 : -2), 30, 95); }
        else { good = true; p.form = clamp(p.form + 0.02, 0.85, 1.15); S.chemistry = clamp(S.chemistry + 1, 0, 100); }
        dirty = true; saveAll();
        out.innerHTML = good ? '<span class="gt-ok">' + esc(p.name) + ' reacted well: “Appreciated, boss.”</span>'
          : '<span class="gt-bad">' + esc(p.name) + ' didn’t take it well: “Not sure that was fair, gaffer.”</span>';
      };
    });
    b.querySelectorAll('[data-m]').forEach(function (btn) {
      btn.onclick = function () {
        var out = b.querySelector('#gt-mr');
        if (X.media === S.week) { out.innerHTML = '<span class="gt-warn">You have already faced the press this week.</span>'; return; }
        X.media = S.week;
        if (btn.dataset.m === 'calm') { S.fanConfidence = clamp(S.fanConfidence - 1, 0, 100); S.morale = clamp(S.morale + 2, 30, 95); out.innerHTML = '<span class="gt-ok">Pressure eased — dressing room relaxes (+morale).</span>'; }
        else { S.fanConfidence = clamp(S.fanConfidence + 3, 0, 100); S.morale = clamp(S.morale - 1, 30, 95); out.innerHTML = '<span class="gt-warn">Fans excited (+confidence) but the squad feels the pressure.</span>'; }
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
    var h = '<div class="gt-note">Templates write straight into your tactics (style / pressing / tempo / width). Reload to apply.</div>';
    Object.keys(TEMPLATES).forEach(function (n) {
      var t = TEMPLATES[n];
      var cur = ['style', 'pressing', 'tempo', 'width'].every(function (k) { return S.tactics[k] === t[k]; });
      h += '<div class="gt-card"><div class="gt-row"><div><b>' + n + '</b><div class="gt-muted">' + t.style + ' · press ' + t.pressing + ' · tempo ' + t.tempo + ' · ' + t.width + '</div></div>' +
        '<button class="gt-btn' + (cur ? '' : ' pri') + '" data-tpl="' + n + '">' + (cur ? 'Active' : 'Use') + '</button></div></div>';
    });
    h += '<div class="gt-card"><h3>Specialist roles</h3><div class="gt-muted">Roaming Playmaker, Inverted Winger and 40+ roles are assigned per player on the Tactics screen (tactical role picker).</div></div>';
    b.appendChild(el(h));
    b.querySelectorAll('[data-tpl]').forEach(function (btn) {
      btn.onclick = function () { Object.assign(S.tactics, TEMPLATES[btn.dataset.tpl]); dirty = true; saveAll(); toast(btn.dataset.tpl + ' applied. Reload the page to take effect.'); render(); };
    });
  }

  function tabSetPieces(b) {
    var sq = squad();
    function pick(id, val) {
      return '<select class="gt-sel" id="' + id + '"><option value="">— auto —</option>' + sq.map(function (p) {
        return '<option value="' + p.id + '"' + (val === p.id ? ' selected' : '') + '>' + esc(p.name) + ' (pas ' + p.pas + ', sho ' + p.sho + ')</option>';
      }).join('') + '</select>';
    }
    var sp = X.setPieces;
    var h = '<div class="gt-card"><h3>Takers</h3>' +
      '<div class="gt-row"><span>Corners</span>' + pick('gt-sp-c', sp.corners) + '</div>' +
      '<div class="gt-row"><span>Free kicks</span>' + pick('gt-sp-f', sp.freekicks) + '</div>' +
      '<div class="gt-row"><span>Penalties</span>' + pick('gt-sp-p', sp.pens) + '</div></div>' +
      '<div class="gt-card"><h3>Instructions</h3>' +
      '<div class="gt-row"><span>Attacking corners</span><select class="gt-sel" id="gt-sp-a">' +
      ['mixed', 'near post', 'far post', 'edge of box'].map(function (o) { return '<option' + (sp.att === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></div>' +
      '<div class="gt-row"><span>Defending</span><select class="gt-sel" id="gt-sp-d">' +
      ['zonal', 'man marking', 'hybrid'].map(function (o) { return '<option' + (sp.def === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></div>' +
      '<div style="margin-top:8px"><button class="gt-btn pri" id="gt-sp-save">Save routines</button></div></div>';
    b.appendChild(el(h));
    b.querySelector('#gt-sp-save').onclick = function () {
      sp.corners = +b.querySelector('#gt-sp-c').value || null;
      sp.freekicks = +b.querySelector('#gt-sp-f').value || null;
      sp.pens = +b.querySelector('#gt-sp-p').value || null;
      sp.att = b.querySelector('#gt-sp-a').value; sp.def = b.querySelector('#gt-sp-d').value;
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
      h += '<div class="gt-card"><h3>Pre-match · vs ' + esc(clubName(oppId)) + (home ? ' (H)' : ' (A)') + '</h3>' +
        '<div class="gt-row"><span>Squad strength</span><span>' + us.toFixed(1) + ' vs ' + them.toFixed(1) + '</span></div>' +
        '<div class="gt-row"><span>Verdict</span><span class="' + (edge > 3 ? 'gt-ok' : edge < -3 ? 'gt-bad' : 'gt-warn') + '">' +
        (edge > 3 ? 'Favourites — take the game to them' : edge < -3 ? 'Underdogs — stay compact, hit on the counter' : 'Even contest — control tempo') + '</span></div>' +
        '<div class="gt-muted" style="margin-top:6px">Advice: ' + (edge < -3 ? 'defensive style, low press, fast tempo.' : edge > 3 ? 'attacking style, high press.' : 'balanced style, mid press.') + '</div></div>';
    }
    if (last) {
      var lo = last.homeId === S.userClubId ? last.awayId : last.homeId;
      var gf = last.homeId === S.userClubId ? last.homeGoals : last.awayGoals;
      var ga = last.homeId === S.userClubId ? last.awayGoals : last.homeGoals;
      // deterministic pseudo-xG from goals + fixture id
      var seed = (last.round * 31 + last.homeId * 7 + last.awayId) % 100 / 100;
      var xf = Math.max(0.2, gf + (seed - 0.5) * 1.4).toFixed(2);
      var xa = Math.max(0.2, ga + (0.5 - seed) * 1.2).toFixed(2);
      h += '<div class="gt-card"><h3>Post-match · ' + gf + '–' + ga + ' vs ' + esc(clubName(lo)) + '</h3>' +
        '<div class="gt-row"><span>xG</span><span>' + xf + ' – ' + xa + '</span></div>' +
        '<div class="gt-muted" style="margin-top:6px">' + (gf > +xf ? 'Clinical finishing — you scored above expected.' : 'You created more than you scored — keep the chances coming.') + '</div></div>';
    }
    if (!h) h = '<div class="gt-muted">No fixtures found for your club.</div>';
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
        h += '<div class="gt-note gt-ok">' + esc(p.name) + ' has completed retraining as a ' + done.role + '! Reload to apply.</div>';
      } else if (p) {
        h += '<div class="gt-card"><h3>In progress</h3>' + esc(p.name) + ' → ' + X.retrain.role +
          '<div class="gt-muted">Ready week ' + X.retrain.doneWeek + ' (now week ' + S.week + ')</div>' +
          '<div style="margin-top:8px"><button class="gt-btn" id="gt-rt-cancel">Cancel</button></div></div>';
      } else X.retrain = null;
    }
    if (!X.retrain) {
      h += '<div class="gt-card"><h3>Retrain position</h3><div class="gt-muted" style="margin-bottom:8px">Takes 6 weeks. Younger players adapt best.</div>' +
        '<select class="gt-sel" id="gt-rt-p" style="width:100%">' + sq.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + ' — ' + p.role + ', age ' + p.age + '</option>'; }).join('') + '</select>' +
        '<div style="margin-top:8px;display:flex;gap:8px"><select class="gt-sel" id="gt-rt-r">' + ROLES.map(function (r) { return '<option>' + r + '</option>'; }).join('') + '</select>' +
        '<button class="gt-btn pri" id="gt-rt-go">Start</button></div></div>';
    }
    b.appendChild(el(h));
    var go = b.querySelector('#gt-rt-go');
    if (go) go.onclick = function () {
      var id = +b.querySelector('#gt-rt-p').value, role = b.querySelector('#gt-rt-r').value, p = S.players[id];
      if (p.role === role) { toast(p.name + ' already plays there.'); return; }
      X.retrain = { id: id, role: role, doneWeek: S.week + (p.age <= 23 ? 5 : 7) }; saveAll(); render();
    };
    var cn = b.querySelector('#gt-rt-cancel');
    if (cn) cn.onclick = function () { X.retrain = null; saveAll(); render(); };
  }

  function tabLoans(b) {
    var sq = squad().filter(function (p) { return p.age <= 23 || p.rating < 70; });
    var feeders = (S.clubs || []).filter(function (c) { return c.id !== S.userClubId && c.division > (S.clubs.find(function (u) { return u.id === S.userClubId; }) || { division: 3 }).division; });
    if (!feeders.length) feeders = (S.clubs || []).filter(function (c) { return c.id !== S.userClubId; }).slice(0, 8);
    var h = '<div class="gt-note">Loan a fringe youngster to a feeder club for the rest of the season. His wages come off your bill and he gains development.</div>';
    var out = Object.values(S.players).filter(function (p) { return p.clubId === S.userClubId && p.onLoanUntil; });
    if (out.length || X.loans.length) {
      h += '<div class="gt-card"><h3>Out on loan</h3>' + X.loans.map(function (l) {
        var p = S.players[l.id]; if (!p) return '';
        var wks = Math.max(0, S.week - l.startWeek);
        var prog = wks >= 8 ? 'Excelling — first-team regular' : wks >= 4 ? 'Settling in, getting minutes' : 'Just arrived';
        return '<div class="gt-row"><div><b>' + esc(p.name) + '</b> → ' + esc(l.club) + '<div class="gt-muted">' + prog + ' (' + wks + ' wks)</div></div><span class="gt-tag">until ' + p.onLoanUntil + '</span></div>';
      }).join('') + '</div>';
    }
    h += '<div class="gt-card"><h3>Arrange loan</h3>' +
      '<select class="gt-sel" id="gt-ln-p" style="width:100%">' + (sq.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + ' (' + p.rating + ', age ' + p.age + ')</option>'; }).join('') || '<option value="">no candidates</option>') + '</select>' +
      '<div style="margin-top:8px;display:flex;gap:8px"><select class="gt-sel" id="gt-ln-c" style="flex:1">' + feeders.slice(0, 12).map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('') + '</select>' +
      '<button class="gt-btn pri" id="gt-ln-go">Loan out</button></div></div>';
    b.appendChild(el(h));
    b.querySelector('#gt-ln-go').onclick = function () {
      var id = +b.querySelector('#gt-ln-p').value; if (!id) return;
      var p = S.players[id], cid = +b.querySelector('#gt-ln-c').value;
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
    var h = '<div class="gt-card"><h3>Recruitment meeting</h3><div class="gt-muted" style="margin-bottom:6px">Your scouting team (level ' + lvl + ') recommends:</div>' +
      pool.slice(0, 5).map(function (p) {
        var asked = X.agent[p.id];
        return '<div class="gt-row"><div><b>' + esc(p.name) + '</b> <span class="gt-muted">' + p.role + ', ' + p.age + ', ' + (p.clubId ? esc(clubName(p.clubId)) : 'Free agent') + '</span>' +
          '<div class="gt-muted">Rating ' + p.rating + ' · value ' + money(p.value) + (asked ? ' · <span class="gt-warn">agent wants ' + money(asked) + '</span>' : '') + '</div></div>' +
          (asked ? '<span class="gt-tag">approached</span>' : '<button class="gt-btn" data-ag="' + p.id + '">Approach agent</button>') + '</div>';
      }).join('') + '</div>' +
      '<div class="gt-note">Sign targets via the Transfers screen — agent asking prices give you a negotiating benchmark.</div>';
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
    var h = '<div class="gt-note">Arrange a friendly any time — instant result, small fitness/morale benefit, no league impact.</div>';
    if (X.friendlies.length) {
      h += '<div class="gt-card"><h3>Results</h3>' + X.friendlies.slice(-6).reverse().map(function (f) {
        return '<div class="gt-row"><span>vs ' + esc(f.opp) + ' <span class="gt-muted">(wk ' + f.week + ')</span></span><b class="' + (f.gf > f.ga ? 'gt-ok' : f.gf < f.ga ? 'gt-bad' : 'gt-warn') + '">' + f.gf + '–' + f.ga + '</b></div>';
      }).join('') + '</div>';
    }
    h += '<div class="gt-card"><h3>Arrange friendly</h3><div style="display:flex;gap:8px"><select class="gt-sel" id="gt-fr-c" style="flex:1">' +
      opps.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + ' (Div ' + c.division + ')</option>'; }).join('') +
      '</select><button class="gt-btn pri" id="gt-fr-go">Play</button></div><div id="gt-fr-out" style="margin-top:8px"></div></div>';
    b.appendChild(el(h));
    b.querySelector('#gt-fr-go').onclick = function () {
      var cid = +b.querySelector('#gt-fr-c').value;
      function str(id) { var ps = Object.values(S.players).filter(function (p) { return p.clubId === id; }); return ps.length ? ps.reduce(function (a, p) { return a + p.rating; }, 0) / ps.length : 60; }
      var d = (str(S.userClubId) - str(cid)) / 10;
      function goals(adv) { var g = 0; for (var i = 0; i < 5; i++) if (Math.random() < 0.22 + adv * 0.06) g++; return g; }
      var gf = goals(d), ga = goals(-d);
      X.friendlies.push({ opp: clubName(cid), gf: gf, ga: ga, week: S.week });
      S.morale = clamp(S.morale + (gf > ga ? 2 : gf < ga ? -1 : 1), 30, 95);
      S.chemistry = clamp(S.chemistry + 1, 0, 100);
      dirty = true; saveAll();
      b.querySelector('#gt-fr-out').innerHTML = '<b class="' + (gf > ga ? 'gt-ok' : gf < ga ? 'gt-bad' : 'gt-warn') + '">Full time: ' + gf + '–' + ga + '</b> <span class="gt-muted">+chemistry' + (gf >= ga ? ', +morale' : '') + '</span>';
      render();
    };
  }

  function tabReview(b) {
    var hist = S.history || [];
    var lastS = hist[hist.length - 1];
    var sq = squad();
    var top = sq.slice().sort(function (a, b) { return b.goals - a.goals; })[0];
    var best = sq.slice().sort(function (a, b) { return (b.seasonRatingSum / (b.seasonRatingCount || 1)) - (a.seasonRatingSum / (a.seasonRatingCount || 1)); })[0];
    var h = '<div class="gt-card"><h3>Season ' + S.seasonYear + ' · week ' + S.week + '</h3>' +
      '<div class="gt-row"><span>Manager record</span><span>' + S.manager.wins + 'W ' + S.manager.draws + 'D ' + S.manager.losses + 'L</span></div>' +
      (top ? '<div class="gt-row"><span>Top scorer</span><span>' + esc(top.name) + ' (' + top.goals + ')</span></div>' : '') +
      (best && best.seasonRatingCount ? '<div class="gt-row"><span>Player of the season</span><span>' + esc(best.name) + ' (' + (best.seasonRatingSum / best.seasonRatingCount).toFixed(2) + ')</span></div>' : '') +
      '<div class="gt-row"><span>Budget</span><span>' + money(S.budget) + '</span></div>' +
      '<div class="gt-row"><span>Fan confidence</span><span>' + S.fanConfidence + '/100</span></div></div>';
    if (lastS) {
      h += '<div class="gt-card"><h3>Last season</h3><div class="gt-muted">' +
        Object.keys(lastS).map(function (k) { var v = lastS[k]; return typeof v === 'object' ? '' : '<div class="gt-row"><span>' + esc(k) + '</span><span>' + esc(v) + '</span></div>'; }).join('') + '</div></div>';
    }
    if (S.manager.trophies && S.manager.trophies.length) {
      h += '<div class="gt-card"><h3>Trophy cabinet</h3>' + S.manager.trophies.map(function (t) { return '<span class="gt-tag">🏆 ' + esc(typeof t === 'string' ? t : JSON.stringify(t)) + '</span>'; }).join('') + '</div>';
    }
    b.appendChild(el(h));
  }

  /* ---------- backroom staff & youth development ----------
     Mirrors the engine (gameRules.STAFF_UPGRADE_COST / ACADEMY_UPGRADE_COST and
     seasonProgression.upgradeStaff / upgradeAcademy) so the running game reads a
     consistent save after a reload: budget spent, ledger + news entries added. */
  var STAFF_UPGRADE_COST = [0, 500000, 1500000, 4000000]; // index = new level
  var STAFF_WEEKLY_WAGE = 10000;                          // per level, per role
  var STAFF_MAX_LEVEL = 3;
  var ACADEMY_COST = { 2: 5000000, 3: 12000000 };
  var STAFF_META = [
    ['coach', 'Assistant coach', 'Speeds up player development from training.'],
    ['physio', 'Physio', 'Fewer injuries and faster recovery from knocks.'],
    ['scout', 'Chief scout', 'Wider recruitment shortlist and better hidden gems.']
  ];
  function staff() { var s = S.staff || {}; return { coach: s.coach || 0, physio: s.physio || 0, scout: s.scout || 0 }; }
  function dots(lvl, max) {
    var s = '';
    for (var i = 1; i <= max; i++) s += '<span style="color:' + (i <= lvl ? '#4ade80' : '#3f3f46') + '">●</span>';
    return s;
  }
  function spend(cost, desc) {
    S.budget -= cost;
    (S.ledger = S.ledger || []).unshift({ week: S.week, desc: desc, amount: -cost });
    (S.news = S.news || []).unshift(desc + '.');
    dirty = true;
  }

  function tabStaff(b) {
    var st = staff();
    var bill = (st.coach + st.physio + st.scout) * STAFF_WEEKLY_WAGE;
    var h = '<div class="gt-note">Hire backroom staff to sharpen training and cut injuries. Fees come out of your budget; each level adds £' + (STAFF_WEEKLY_WAGE / 1000) + 'k/wk to wages. Reload to apply in-game.</div>';
    h += '<div class="gt-card"><div class="gt-row"><span>Transfer budget</span><b>' + money(S.budget) + '</b></div>' +
      '<div class="gt-row"><span>Staff wage bill</span><span class="gt-muted">' + money(bill) + '/wk</span></div></div>';
    STAFF_META.forEach(function (m) {
      var role = m[0], lvl = st[role], next = STAFF_UPGRADE_COST[lvl + 1];
      var maxed = lvl >= STAFF_MAX_LEVEL, afford = !maxed && S.budget >= next;
      h += '<div class="gt-card"><div class="gt-row"><div><b>' + m[1] + '</b> ' + dots(lvl, STAFF_MAX_LEVEL) +
        '<div class="gt-muted">' + m[2] + '</div></div>' +
        (maxed ? '<span class="gt-tag gt-ok">Max</span>'
          : '<button class="gt-btn' + (afford ? ' pri' : '') + '" data-staff="' + role + '"' + (afford ? '' : ' disabled') + '>Hire · ' + money(next) + '</button>') +
        '</div></div>';
    });
    var alvl = S.academyLevel || 1, acost = ACADEMY_COST[alvl + 1], amax = !acost;
    h += '<div class="gt-card"><h3>Youth development</h3><div class="gt-row"><div><b>Academy — level ' + alvl + '</b>' +
      '<div class="gt-muted">' + (alvl >= 3 ? 'Elite academy: two top prospects graduate every season.'
        : 'Produces one prospect each season. Higher levels graduate better, more numerous youngsters.') + '</div></div>' +
      (amax ? '<span class="gt-tag gt-ok">Max</span>'
        : '<button class="gt-btn' + (S.budget >= acost ? ' pri' : '') + '" id="gt-acad"' + (S.budget >= acost ? '' : ' disabled') + '>Upgrade · ' + money(acost) + '</button>') +
      '</div></div>';
    b.appendChild(el(h));
    b.querySelectorAll('[data-staff]').forEach(function (btn) {
      btn.onclick = function () {
        var role = btn.dataset.staff, lvl = staff()[role], cost = STAFF_UPGRADE_COST[lvl + 1];
        if (lvl >= STAFF_MAX_LEVEL || S.budget < cost) return;
        S.staff = staff(); S.staff[role] = lvl + 1;
        var label = STAFF_META.filter(function (m) { return m[0] === role; })[0][1];
        spend(cost, label + ' hired (level ' + (lvl + 1) + ')');
        saveAll(); toast(label + ' hired. Reload to apply.'); render();
      };
    });
    var ab = b.querySelector('#gt-acad');
    if (ab) ab.onclick = function () {
      var cost = ACADEMY_COST[(S.academyLevel || 1) + 1];
      if (!cost || S.budget < cost) return;
      S.academyLevel = (S.academyLevel || 1) + 1;
      spend(cost, 'Youth academy upgrade (level ' + S.academyLevel + ')');
      saveAll(); toast('Academy upgraded. Reload to apply.'); render();
    };
  }

  /* ---------- training / fitness management ----------
     Writes S.training (the engine's weekly focus). 'fitness' lowers injury risk and
     speeds recovery; the others bias development by position. */
  var FOCI = [
    ['balanced', 'Balanced', 'Steady all-round development for the whole squad.'],
    ['attack', 'Attacking', 'Midfielders and forwards develop faster.'],
    ['defense', 'Defensive', 'Goalkeepers and defenders develop faster.'],
    ['fitness', 'Fitness', 'Injury prevention: fewer knocks, quicker recovery. No rating growth while focused here.']
  ];
  function tabTraining(b) {
    var cur = S.training || 'balanced', st = staff();
    var h = '<div class="gt-note">Set the weekly training focus. A better assistant coach speeds development; a fitness focus and a good physio keep players available. Reload to apply.</div>';
    h += '<div class="gt-card"><h3>Training focus</h3>';
    FOCI.forEach(function (f) {
      var on = cur === f[0];
      h += '<div class="gt-row"><div><b>' + f[1] + '</b><div class="gt-muted">' + f[2] + '</div></div>' +
        (on ? '<span class="gt-tag gt-ok">Active</span>' : '<button class="gt-btn pri" data-focus="' + f[0] + '">Select</button>') + '</div>';
    });
    h += '</div>';
    var all = Object.values(S.players).filter(function (p) { return p.clubId === S.userClubId && !p.onLoanUntil; });
    var inj = all.filter(function (p) { return p.injuryWeeks > 0; }).sort(function (a, b) { return b.injuryWeeks - a.injuryWeeks; });
    h += '<div class="gt-card"><h3>Fitness room</h3>' +
      '<div class="gt-row"><span>Available</span><b class="gt-ok">' + (all.length - inj.length) + '</b></div>' +
      '<div class="gt-row"><span>In the treatment room</span><b class="' + (inj.length ? 'gt-warn' : 'gt-ok') + '">' + inj.length + '</b></div>' +
      '<div class="gt-row"><span>Physio</span><span>' + dots(st.physio, STAFF_MAX_LEVEL) + '</span></div>' +
      inj.map(function (p) {
        return '<div class="gt-row"><span>' + esc(p.name) + '</span><span class="gt-warn">out ' + p.injuryWeeks + ' wk' + (p.injuryWeeks > 1 ? 's' : '') + '</span></div>';
      }).join('') +
      '<div class="gt-muted" style="margin-top:6px">' + (cur === 'fitness' ? 'Fitness focus active — injury risk reduced this week.'
        : 'Switch to a fitness focus to reduce injury risk when the squad is stretched.') + '</div></div>';
    b.appendChild(el(h));
    b.querySelectorAll('[data-focus]').forEach(function (btn) {
      btn.onclick = function () { S.training = btn.dataset.focus; dirty = true; saveAll(); toast('Training focus set. Reload to apply.'); render(); };
    });
  }

  /* ---------- shell ---------- */
  var active = 'Dynamics';
  function render() {
    var body = document.getElementById('gt-body');
    if (!body) return;
    body.innerHTML = '';
    if (!loadSlot()) { body.innerHTML = '<div class="gt-note">No save found. Start a career first, then reopen the Tools panel.</div>'; return; }
    dirty = false;
    TABS[active](body);
    document.querySelectorAll('#gt-tabs button').forEach(function (t) { t.classList.toggle('act', t.textContent === active); });
  }
  function toast(msg) {
    var t = el('<div style="position:fixed;left:50%;bottom:70px;transform:translateX(-50%);background:#fafafa;color:#09090b;padding:8px 14px;border-radius:8px;font:600 13px system-ui;z-index:10001">' + esc(msg) + '</div>').firstChild;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600);
  }
  function boot() {
    var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/football-manager/gaffer-tools.css'; document.head.appendChild(css);
    var fab = el('<button id="gt-fab">⚽ Tools</button>').firstChild;
    var panel = el('<div id="gt-panel"><div id="gt-sheet"><div id="gt-head"><h2>Manager Tools</h2><button id="gt-close">✕</button></div><div id="gt-tabs">' +
      Object.keys(TABS).map(function (t) { return '<button>' + t + '</button>'; }).join('') + '</div><div id="gt-body"></div></div></div>').firstChild;
    document.body.appendChild(fab); document.body.appendChild(panel);
    fab.onclick = function () { panel.classList.add('open'); render(); };
    panel.querySelector('#gt-close').onclick = function () { panel.classList.remove('open'); };
    panel.onclick = function (e) { if (e.target === panel) panel.classList.remove('open'); };
    panel.querySelectorAll('#gt-tabs button').forEach(function (t) { t.onclick = function () { active = t.textContent; render(); }; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
