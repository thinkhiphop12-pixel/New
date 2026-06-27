/* ============================================================
   Ball Knowledge — daily slate / cross-game engagement loop.
   Tracks which daily puzzles you've completed today and your
   per-game streaks, and renders a slate strip that nudges you
   to play the rest. Pure localStorage, no backend.
   ============================================================ */
(function (w) {
  'use strict';
  var KEY = 'bk_daily_v1';
  var GAMES = [
    { id: 'footle',      name: 'Footle',         path: '/footle/' },
    { id: 'connections', name: 'Connections XI', path: '/connections/' },
    { id: 'strands',     name: 'Pitch Strands',  path: '/strands/' },
    { id: 'letterboxed', name: 'Starting XI',    path: '/letterboxed/' }
  ];

  function today() {
    var epoch = Date.UTC(2024, 0, 1);
    var n = new Date();
    return Math.floor((Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) - epoch) / 864e5);
  }
  function load() { try { return JSON.parse(w.localStorage.getItem(KEY)) || { games: {} }; } catch (e) { return { games: {} }; } }
  function save(s) { try { w.localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  function record(id) {
    var s = load(), t = today();
    var g = s.games[id] || { lastDay: null, streak: 0, plays: 0 };
    if (g.lastDay !== t) {
      g.streak = (g.lastDay === t - 1) ? (g.streak || 0) + 1 : 1;
      g.lastDay = t;
      g.plays = (g.plays || 0) + 1;
    }
    s.games[id] = g;
    save(s);
  }
  function doneToday(id) { var g = load().games[id]; return !!g && g.lastDay === today(); }
  function streakOf(id) { var g = load().games[id]; if (!g) return 0; return (g.lastDay === today() || g.lastDay === today() - 1) ? (g.streak || 0) : 0; }

  function renderStrip(el, currentId) {
    if (!el) return;
    var doneCount = GAMES.filter(function (g) { return doneToday(g.id); }).length;
    var html = '<div class="slate-head"><span class="slate-title">Today\'s slate</span>' +
      '<span class="slate-count">' + doneCount + ' / ' + GAMES.length + ' done</span></div><div class="slate-chips">';
    GAMES.forEach(function (g) {
      var done = doneToday(g.id);
      var cur = g.id === currentId;
      var st = streakOf(g.id);
      html += '<a class="slate-chip' + (done ? ' is-done' : '') + (cur ? ' is-current' : '') + '" href="' + g.path + '">' +
        '<span class="sc-mark">' + (done ? '✓' : (cur ? '▶' : '○')) + '</span>' +
        '<span class="sc-name">' + g.name + '</span>' +
        (st > 1 ? '<span class="sc-streak">🔥' + st + '</span>' : '') +
        '</a>';
    });
    html += '</div>';
    el.innerHTML = html;
    el.classList.add('daily-slate');
  }

  w.BKDaily = { today: today, record: record, doneToday: doneToday, streakOf: streakOf, renderStrip: renderStrip, GAMES: GAMES };

  // Auto-mount on any page with #dailySlate (data-game attribute = current id)
  document.addEventListener('DOMContentLoaded', function () {
    var el = document.getElementById('dailySlate');
    if (el) renderStrip(el, el.getAttribute('data-game') || '');
  });
})(window);
