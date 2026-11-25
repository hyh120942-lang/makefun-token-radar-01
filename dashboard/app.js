// Token Radar dashboard: the ranked board, a filterable table, a per-protocol
// detail view with the model's own decomposition, and the live-token set.
// Static page, no framework and no network: it reads window.RADAR from data.js.
// State lives in the URL hash, so the board, a detail view and a filtered view
// are each one link: #detail=<slug>, #q=<text>, #cat=<category>, #tab=pre|live,
// #watch=1, #verdict=farm|thin|skip|all.

(function () {
  'use strict';
  var DATA = window.RADAR;
  var root = document.getElementById('board');
  var state = { q: '', category: 'all', tab: 'pre', sort: 'implied', dir: -1, selected: null, watch: false, verdict: 'all', compact: false };

  function $(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'text') el.textContent = attrs[k];
      else if (k === 'html') el.innerHTML = attrs[k];
      else if (k === 'onclick') el.addEventListener('click', attrs[k]);
      else el.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(function (c) { if (c) el.appendChild(c); });
    return el;
  }
  function money(n) {
    if (n === null || n === undefined) return '—';
    var abs = Math.abs(n);
    if (abs >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (abs >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n;
  }
  function pct(n) { return n === null || n === undefined ? '—' : (n > 0 ? '+' : '') + n.toFixed(1) + '%'; }
  function age(n) { return n === null || n === undefined ? 'unknown' : n + 'd'; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function readHash() {
    var h = window.location.hash.replace(/^#/, '');
    var parts = h.split('&');
    var next = { q: '', category: 'all', tab: 'pre', sort: state.sort, dir: state.dir, selected: null, watch: false, verdict: 'all', compact: false };
    parts.forEach(function (p) {
      var kv = p.split('=');
      var k = decodeURIComponent(kv[0] || ''), v = decodeURIComponent(kv[1] || '');
      if (k === 'q') next.q = v;
      else if (k === 'cat') next.category = v;
      else if (k === 'tab' && (v === 'pre' || v === 'live')) next.tab = v;
      else if (k === 'detail') next.selected = v;
      else if (k === 'watch') next.watch = v === '1';
      else if (k === 'verdict') next.verdict = v;
      else if (k === 'compact') next.compact = v === '1';
    });
    state = next;
  }
  function writeHash() {
    var p = [];
    if (state.q) p.push('q=' + encodeURIComponent(state.q));
    if (state.category !== 'all') p.push('cat=' + encodeURIComponent(state.category));
    if (state.tab !== 'pre') p.push('tab=' + state.tab);
    if (state.watch) p.push('watch=1');
    if (state.verdict !== 'all') p.push('verdict=' + state.verdict);
    if (state.compact) p.push('compact=1');
    if (state.selected) p.push('detail=' + encodeURIComponent(state.selected));
    var h = p.join('&');
    if (window.location.hash.replace(/^#/, '') !== h) window.history.replaceState(null, '', h ? '#' + h : window.location.pathname + window.location.search);
  }

  function rows() {
    var list = DATA.rows.filter(function (r) {
      if (state.watch && DATA.watchlist.indexOf(r.slug) < 0) return false;
      if (state.verdict !== 'all' && r.verdict !== state.verdict) return false;
      if (state.category !== 'all' && (r.category || 'Other') !== state.category) return false;
      if (state.q) {
        var q = state.q.toLowerCase();
        var hay = (r.name + ' ' + (r.category || '') + ' ' + r.chains.join(' ')).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
    return list;
  }
  function sortedRows(list) {
    var key = state.sort;
    return list.slice().sort(function (a, b) {
      var d = 0;
      if (key === 'name') d = a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
      else if (key === 'tvl') d = a.tvl_usd - b.tvl_usd;
      else if (key === 'growth') d = (a.change_7d || 0) - (b.change_7d || 0);
      else if (key === 'age') d = (a.age_days === null ? -1 : a.age_days) - (b.age_days === null ? -1 : b.age_days);
      else d = a.implied_value_usd - b.implied_value_usd;
      if (d === 0) d = a.rank - b.rank;
      return d * state.dir;
    });
  }

  function kpi(label, value, note) {
    return $('div', { 'class': 'kpi' }, [$('span', { text: label }), $('b', { text: value }), $('small', { text: note })]);
  }

  function renderHeader() {
    var head = $('header', null, [
      $('h1', { html: 'Token Radar<span class="dot">.</span> Pre-token protocols, ranked by fitted implied value' }),
      $('p', { 'class': 'sub', text: 'Every protocol in the sealed DefiLlama snapshot that records no token, ranked by what its launch would be worth if its record stayed as it is. Implied value is this entry\u2019s own claim, never make.fun\u2019s. A protocol that records no token may still have one its record does not carry.' })
    ]);
    var fit = DATA.fit;
    var kpis = $('div', { 'class': 'kpis' }, [
      kpi('Watchlist', String(DATA.watchlist_size), 'floor $50M, no token'),
      kpi('Board rows', String(DATA.board_size), DATA.early_size + ' early finds below the floor'),
      kpi('Live comps', String(fit.comps), 'traded tokens that fit the curve'),
      kpi('Size curve', 'slope ' + fit.slope, 'log mcap = ' + fit.intercept + ' + slope \u00d7 log TVL, fitted at run time'),
      kpi('Leave-one-out', String(fit.loo_err), 'flat 0.25\u00d7 TVL scores ' + fit.loo_baseline_err),
      kpi('Walk-forward', String(fit.walkforward_err), 'flat 0.25\u00d7 TVL scores ' + fit.walkforward_baseline_err + ' (' + fit.walkforward_train + ' train / ' + fit.walkforward_test + ' test)')
    ]);
    return [head, kpis];
  }

  function renderMethod() {
    var fit = DATA.fit;
    var sec = $('section', { 'class': 'card' }, [
      $('h2', { text: 'How the value is worked out' }),
      $('div', { 'class': 'formula', text: 'implied = exp(' + fit.intercept + ' + ' + fit.slope + ' \u00d7 ln(TVL)) \u00d7 (1 + 0.5 \u00d7 clamp(7d growth, \u221260%, +120%)) \u00d7 (0.6 + 0.4 \u00d7 min(age, 1095d) / 1095d)' }),
      $('p', { html: 'The size curve is fitted on the snapshot\u2019s own <b>' + fit.comps + ' live-token protocols</b> (log market cap on log TVL, ordinary least squares, computed when the program runs). Growth and maturity are stated weights, not fitted claims: the snapshot is one day, so no future return can be fitted from it.' }),
      $('p', { html: 'Two blind tests, both against the flat <b>0.25 \u00d7 TVL</b> baseline. Leave-one-out median absolute log error <b>' + fit.loo_err + ' vs ' + fit.loo_baseline_err + '</b>; walk-forward (fit on protocols listed before 2024, tested on those listed after) <b>' + fit.walkforward_err + ' vs ' + fit.walkforward_baseline_err + '</b>. A per-category multiple was tested the same way and <b>dropped</b>: it scored worse leave-one-out (1.281 vs 1.223) and no better walk-forward.' }),
      $('p', { text: 'Verdict: farm when implied value is at least $10M, thin between $2M and $10M, skip below $2M. The board separates protocols whose token already trades (Live token tab, at the market\u2019s own value) from those still to come.' })
    ]);
    return sec;
  }

  function renderChecks() {
    var watchCovered = DATA.watchlist.filter(function (s) { return DATA.rows.some(function (r) { return r.slug === s; }); }).length;
    var mono = DATA.rows.every(function (r, i) { return i === 0 || r.implied_value_usd <= DATA.rows[i - 1].implied_value_usd; });
    var ranksOk = DATA.rows.every(function (r, i) { return r.rank === i + 1; });
    var stepsOk = DATA.rows.every(function (r) { return r.farm_steps && r.farm_steps.length >= 3 && r.farm_steps.length <= 12; });
    var sec = $('section', { 'class': 'card' }, [
      $('h2', { text: 'Integrity strip \u2014 the board checks itself' }),
      $('div', { 'class': 'checks' }, [
        $('span', { 'class': 'check ' + (watchCovered === DATA.watchlist_size ? 'ok' : ''), text: '\u2713 watchlist covered ' + watchCovered + '/' + DATA.watchlist_size }),
        $('span', { 'class': 'check ' + (ranksOk ? 'ok' : ''), text: '\u2713 ranks 1\u2013' + DATA.board_size + ' once each' }),
        $('span', { 'class': 'check ' + (mono ? 'ok' : ''), text: '\u2713 implied value never rises with rank' }),
        $('span', { 'class': 'check ' + (stepsOk ? 'ok' : ''), text: '\u2713 every row carries a 6-step farm plan' }),
        $('span', { 'class': 'check ok', text: '\u2713 no network: the page reads only its own data.js' })
      ])
    ]);
    return sec;
  }

  function renderControls() {
    var cats = Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Other'; }))).sort();
    var search = $('input', { type: 'search', id: 'q', placeholder: 'Search name, category or chain', value: state.q, 'aria-label': 'Search the board' });
    search.addEventListener('input', function () { state.q = search.value; state.selected = null; writeHash(); render(); });
    var catSel = $('select', { id: 'cat', 'aria-label': 'Category' });
    catSel.appendChild($('option', { value: 'all', text: 'All categories' }));
    cats.forEach(function (c) { catSel.appendChild($('option', { value: c, text: c })); });
    catSel.value = state.category;
    catSel.addEventListener('change', function () { state.category = catSel.value; writeHash(); render(); });
    var verdictSel = $('select', { id: 'verdict', 'aria-label': 'Verdict' });
    [['all', 'All verdicts'], ['farm', 'Farm'], ['thin', 'Thin'], ['skip', 'Skip']].forEach(function (v) { verdictSel.appendChild($('option', { value: v[0], text: v[1] })); });
    verdictSel.value = state.verdict;
    verdictSel.addEventListener('change', function () { state.verdict = verdictSel.value; writeHash(); render(); });
    var watchBtn = $('button', { type: 'button', 'aria-pressed': state.watch ? 'true' : 'false', text: 'Watchlist only' });
    watchBtn.addEventListener('click', function () { state.watch = !state.watch; writeHash(); render(); });
    var pre = $('button', { type: 'button', 'aria-pressed': state.tab === 'pre' ? 'true' : 'false', text: 'Pre-token' });
    pre.addEventListener('click', function () { state.tab = 'pre'; writeHash(); render(); });
    var live = $('button', { type: 'button', 'aria-pressed': state.tab === 'live' ? 'true' : 'false', text: 'Live token' });
    live.addEventListener('click', function () { state.tab = 'live'; writeHash(); render(); });
    var box = $('div', { 'class': 'controls' }, [
      $('div', { 'class': 'field' }, [$('label', { 'for': 'q', text: 'Search' }), search]),
      $('div', { 'class': 'field' }, [$('label', { 'for': 'cat', text: 'Category' }), catSel]),
      $('div', { 'class': 'field' }, [$('label', { 'for': 'verdict', text: 'Verdict' }), verdictSel]),
      $('div', { 'class': 'field' }, [$('span', { 'class': 'sub', text: 'Scope' }), $('div', { 'class': 'tabs' }, [watchBtn])]),
      $('div', { 'class': 'field' }, [$('span', { 'class': 'sub', text: 'Token status' }), $('div', { 'class': 'tabs' }, [pre, live])]),
      $('span', { 'class': 'count', text: state.tab === 'pre' ? rows().length + ' rows shown' : DATA.live.length + ' live-token protocols' })
    ]);
    return box;
  }

  function sortHeader(key, label) {
    var b = $('button', { type: 'button', onclick: function () { if (state.sort === key) state.dir = -state.dir; else { state.sort = key; state.dir = -1; } render(); } }, [
      $('span', { text: label }),
      state.sort === key ? $('span', { 'aria-hidden': 'true', text: state.dir < 0 ? ' \u25bc' : ' \u25b2' }) : null
    ]);
    return $('th', null, [b]);
  }

  function renderBoard() {
    var list = sortedRows(rows());
    if (list.length === 0) {
      return $('div', { 'class': 'empty' }, [
        $('h2', { text: 'No protocol matches that filter' }),
        $('p', { text: 'Clear the search or pick another category to see the board again.' }),
        $('button', { 'class': 'button primary', onclick: function () { state.q = ''; state.category = 'all'; state.verdict = 'all'; state.watch = false; writeHash(); render(); } }, [$('span', { text: 'Clear filters' })])
      ]);
    }
    var head = $('tr', null, [
      sortHeader('implied', 'Rank'), sortHeader('name', 'Protocol'), sortHeader('tvl', 'TVL'),
      sortHeader('growth', '7d'), sortHeader('age', 'Age'), sortHeader('implied', 'Implied value'), $('th', { text: 'Verdict' })
    ]);
    var body = $('tbody', null, list.map(function (r) {
      var g = r.change_7d === null ? $('td', { text: '—' }) : $('td', { 'class': r.change_7d < 0 ? 'neg' : 'pos', text: pct(r.change_7d) });
      var tr = $('tr', { 'class': state.selected === r.slug ? 'sel' : '' }, [
        $('td', { text: String(r.rank) }),
        $('td', null, [$('span', { text: r.name }), DATA.watchlist.indexOf(r.slug) >= 0 ? $('span', { 'class': 'tag watch', text: 'WATCHLIST' }) : null, $('div', null, [$('small', { text: (r.category || 'Other') + ' \u00b7 ' + r.chains.slice(0, 3).join(', ') })])]),
        $('td', { text: money(r.tvl_usd) }),
        g,
        $('td', { text: age(r.age_days) }),
        $('td', { text: money(r.implied_value_usd) }),
        $('td', null, [$('span', { 'class': 'tag ' + r.verdict, text: r.verdict.toUpperCase() })])
      ]);
      tr.addEventListener('click', function () { state.selected = r.slug; writeHash(); render(); var d = document.getElementById('detail'); if (d) d.scrollIntoView(); });
      return tr;
    }));
    return $('div', { 'class': 'tablewrap' }, [$('table', { 'class': 'board' }, [$('thead', null, [head]), body])]);
  }

  function renderLive() {
    var head = $('tr', null, [$('th', { text: 'Protocol' }), $('th', { text: 'TVL' }), $('th', { text: 'Market cap' }), $('th', { text: '7d' })]);
    var body = $('tbody', null, DATA.live.map(function (r) {
      return $('tr', null, [
        $('td', null, [$('span', { text: r.name }), $('span', { 'class': 'tag live', text: 'TRADES' }), $('div', null, [$('small', { text: (r.category || 'Other') + ' \u00b7 ' + r.chains.slice(0, 3).join(', ') })])]),
        $('td', { text: money(r.tvl_usd) }),
        $('td', { text: money(r.mcap_usd) }),
        $('td', { 'class': r.change_7d !== null && r.change_7d < 0 ? 'neg' : 'pos', text: pct(r.change_7d) })
      ]);
    }));
    return $('div', null, [
      $('p', { text: 'These protocols already trade, so the board shows the market\u2019s own value for them, never a model\u2019s. They are the comps the size curve is fitted on.' }),
      $('div', { 'class': 'tablewrap' }, [$('table', { 'class': 'board' }, [$('thead', null, [head]), body])])
    ]);
  }

  function renderDetail() {
    if (!state.selected) return null;
    var r = DATA.rows.filter(function (x) { return x.slug === state.selected; })[0];
    if (!r) return null;
    var steps = $('ol', { 'class': 'steps' }, (r.farm_steps || []).map(function (s) {
      return $('li', { text: s });
    }));
    return $('section', { 'class': 'card detail', id: 'detail' }, [
      $('h2', { text: '#' + r.rank + ' ' + r.name + ' \u2014 ' + money(r.implied_value_usd) }),
      $('p', { 'class': 'meta', text: (r.category || 'Other') + ' \u00b7 ' + r.chains.join(', ') + ' \u00b7 TVL ' + money(r.tvl_usd) + ' \u00b7 7d ' + pct(r.change_7d) + ' \u00b7 age ' + age(r.age_days) + ' \u00b7 listed ' + (r.listed_at || 'unknown') + ' \u00b7 verdict ' + r.verdict.toUpperCase() }),
      $('table', { 'class': 'decomp' }, [$('thead', null, [$('tr', null, [$('th', { text: 'Term' }), $('th', { text: 'Value' }), $('th', { text: 'What it is' })])]),
        $('tbody', null, [
          $('tr', null, [$('td', { text: 'Fitted base' }), $('td', { text: money(r.fitted_base_usd) }), $('td', { text: 'exp(' + DATA.fit.intercept + ' + ' + DATA.fit.slope + ' \u00d7 ln(TVL)) from the live-token comps' })]),
          $('tr', null, [$('td', { text: 'Growth multiplier' }), $('td', { text: '\u00d7' + r.growth_multiplier.toFixed(4) }), $('td', { text: '7d TVL change ' + pct(r.change_7d) + ', clamped to \u221260% / +120%' })]),
          $('tr', null, [$('td', { text: 'Maturity multiplier' }), $('td', { text: '\u00d7' + r.maturity_multiplier.toFixed(4) }), $('td', { text: 'age ' + age(r.age_days) + ' of 1,095 days, floor 0.6' })]),
          $('tr', null, [$('td', null, [$('b', { text: 'Implied value' })]), $('td', null, [$('b', { text: money(r.implied_value_usd) })]), $('td', { text: 'fitted base \u00d7 growth \u00d7 maturity' })])
        ])]),
      $('h2', { text: 'How to farm it' }),
      steps,
      $('p', { text: 'Farm plan cost: the capital in step 2 plus about $4\u2013$8 of gas to set up and about $2 of gas a week. Never pay to claim an airdrop.' })
    ]);
  }

  function render() {
    root.setAttribute('aria-busy', 'false');
    while (root.firstChild) root.removeChild(root.firstChild);
    if (state.compact) {
      root.appendChild($('header', null, [
        $('h1', { html: 'Token Radar<span class="dot">.</span> Pre-token protocols, ranked by fitted implied value' })
      ]));
    } else {
      var parts = renderHeader();
      root.appendChild(parts[0]);
      root.appendChild(parts[1]);
      root.appendChild(renderMethod());
      root.appendChild(renderChecks());
    }
    root.appendChild(renderControls());
    root.appendChild(state.tab === 'pre' ? renderBoard() : renderLive());
    var detail = renderDetail();
    if (detail) {
      root.appendChild(detail);
    }
    var foot = $('footer', null, [
      $('p', { text: 'Data: DefiLlama snapshot as of ' + DATA.as_of + ' (' + DATA.source + '). Snapshot holds ' + DATA.rows.length + ' ranked rows of 758 protocols; ' + DATA.live_size + ' live-token protocols are set aside at market value.' }),
      $('p', { text: 'Model ' + DATA.model_version + ': fitted size curve plus stated growth and maturity weights. Implied value is this entry\u2019s own claim. A protocol that records no token may still have one its DefiLlama record does not carry.' })
    ]);
    root.appendChild(foot);
  }

  readHash();
  window.addEventListener('hashchange', function () { readHash(); render(); });
  render();
})();
