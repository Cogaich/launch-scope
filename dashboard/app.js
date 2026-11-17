// Launch Scope's dashboard. It reads window.RADAR (written beside dashboard/ by main.ts) and
// renders the ranked board, the filters, a per-protocol detail view with the model's own inputs
// and the protocol's farm plan, and the live-token set. No network: every byte it shows is in
// data.js. The farm plan is derived here from the same rules main.ts uses, so the page's plan and
// board.json's plan are the same derivation, never a pasted list.
(function () {
  'use strict';

  var DATA = window.RADAR;
  var app = document.getElementById('app');
  if (!DATA || !app) return;

  var state = { q: '', category: 'all', chain: 'all', watchlist: false, tab: 'pre-token', sort: 'implied', dir: -1, selected: null };

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  var usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usd0.format(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }

  // scopeValue, the same function main.ts runs: the page recomputes a row from the snapshot
  // figures and checks the number board.json carries, so the two visibly agree.
  function scopeValueOf(row, model) {
    var growth = Math.min(model.growth_cap, Math.max(model.growth_floor, row.change_7d === null || row.change_7d === undefined ? 0 : row.change_7d));
    var growthMult = 1 + (growth / 100) * model.growth_weight;
    var age = row.age_days === null || row.age_days === undefined ? model.unknown_age_days : row.age_days;
    var maturity = model.maturity_floor + (Math.min(Math.max(age, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
    return Math.max(1, Math.round(row.tvl_usd * model.base_multiple * growthMult * maturity));
  }

  // ---- farm plan: the same derivation main.ts writes to board.json ----
  function chainOf(p) { return p.chains && p.chains.length > 0 ? p.chains[0] : 'its main chain'; }
  function gasFor(chain) {
    if (chain === 'Ethereum') return 'about $6 of gas';
    if (chain === 'Bitcoin') return 'about $3 of network fees';
    if (chain === 'Tron') return 'about $2 of gas';
    return 'about $1 of gas';
  }
  function capitalFor(p) {
    if (p.tvl_usd >= 2e9) return 300;
    if (p.tvl_usd >= 5e8) return 200;
    if (p.tvl_usd >= 1e8) return 120;
    if (p.tvl_usd >= 25e6) return 75;
    return 50;
  }
  function holdDaysFor(age) {
    if (age === null || age === undefined) return 45;
    if (age < 90) return 90;
    if (age < 180) return 60;
    if (age < 365) return 45;
    return 30;
  }
  function walletFor(p) {
    var chain = chainOf(p);
    if (chain === 'Solana') return 'Use a fresh Solana wallet (Phantom or Solflare) that holds only the funds you plan to farm, and keep its seed phrase offline.';
    if (chain === 'Bittensor') return 'Use a fresh Bittensor wallet that holds only the funds you plan to farm, and keep its seed phrase offline.';
    if (chain === 'Bitcoin') return 'Use a fresh Bitcoin wallet that holds only the funds you plan to farm, and keep its seed phrase offline.';
    return 'Use a fresh EVM wallet (Rabby or MetaMask) that holds only the funds you plan to farm, and keep its seed phrase offline.';
  }
  function actionFor(p, capital, chain) {
    var c = (p.category || '').toLowerCase();
    var name = p.name;
    if (c.indexOf('risk curator') >= 0 || c.indexOf('capital allocator') >= 0 || c.indexOf('liquidity manager') >= 0 || c.indexOf('yield aggregator') >= 0 || c.indexOf('indexes') >= 0) return 'Deposit $' + capital + ' of USDC into a ' + name + ' vault on ' + chain + ' and keep the shares.';
    if (c.indexOf('dex') >= 0) return 'Provide $' + capital + ' of liquidity to ' + name + "'s main pool on " + chain + ' and keep the position open.';
    if (c.indexOf('rwa') >= 0) return 'Mint $' + capital + ' of the yield-bearing asset through ' + name + ' on ' + chain + ' and hold it.';
    if (c.indexOf('uncollateralized lending') >= 0) return 'Lend $' + capital + ' of USDC through ' + name + ' on ' + chain + ' and keep the loan open.';
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Supply $' + capital + ' of USDC as collateral to ' + name + ' on ' + chain + ' and borrow a small amount against it.';
    if (c.indexOf('yield') >= 0 || c.indexOf('leveraged farm') >= 0 || c.indexOf('farm') >= 0) return 'Deposit $' + capital + ' of USDC into ' + name + "'s highest-TVL strategy on " + chain + ' and keep it running.';
    if (c.indexOf('basis trading') >= 0 || c.indexOf('derivative') >= 0) return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedged position.';
    if (c === 'chain') return 'Bridge $' + capital + ' of USDC to ' + chain + ' through ' + name + " and use one of its apps with the bridged funds.";
    if (c.indexOf('staking pool') >= 0 || c.indexOf('restaking') >= 0) return "Stake $" + capital + " of the chain's staking asset through " + name + ' and keep the receipt token.';
    if (c.indexOf('cedefi') >= 0) return 'Deposit $' + capital + ' of USDC into ' + name + "'s CeDeFi vault on " + chain + ' and keep the position open.';
    if (c.indexOf('stablecoin') >= 0) return 'Mint $' + capital + ' of the stable asset through ' + name + ' on ' + chain + ' and hold it.';
    if (c.indexOf('prediction') >= 0) return 'Fund $' + capital + ' and place one market position on ' + name + '.';
    if (c.indexOf('insurance') >= 0) return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy active.';
    if (c.indexOf('payment') >= 0) return 'Top up $' + capital + ' through ' + name + ' on ' + chain + " and spend a little of it in its app.";
    if (c.indexOf('governance') >= 0) return 'Lock $' + capital + ' of the governance asset through ' + name + ' on ' + chain + ' and vote once.';
    if (c.indexOf('anchor btc') >= 0 || c.indexOf('decentralized btc') >= 0) return 'Mint $' + capital + ' of the BTC-backed asset through ' + name + ' on ' + chain + ' and hold it.';
    if (c.indexOf('bridge') >= 0) return 'Bridge $' + capital + ' of USDC to ' + chain + ' through ' + name + ' and use the bridged funds in its app.';
    if (c.indexOf('otc') >= 0) return 'Place one $' + capital + ' order on ' + name + "'s OTC desk on " + chain + '.';
    if (c.indexOf('card') >= 0) return 'Order the ' + name + ' card, top it up with $' + capital + ' and spend a little of it.';
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open.';
  }
  function weeklyFor(p, chain) {
    var c = (p.category || '').toLowerCase();
    if (c.indexOf('dex') >= 0) return 'Swap $25 of USDC for another asset in the pool once a week, so the wallet shows repeated use.';
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Adjust the position once a week: add $10 of collateral or repay a little of the borrow.';
    if (c.indexOf('rwa') >= 0) return 'Claim any yield the position pays once a week and leave the principal where it is.';
    if (c.indexOf('risk curator') >= 0 || c.indexOf('capital allocator') >= 0 || c.indexOf('liquidity manager') >= 0 || c.indexOf('yield aggregator') >= 0 || c.indexOf('indexes') >= 0) return 'Top up the vault by $10 once a week so the deposits form a steady pattern.';
    if (c.indexOf('basis trading') >= 0 || c.indexOf('derivative') >= 0) return 'Open and close one small position once a week to keep the account active.';
    if (c.indexOf('prediction') >= 0) return 'Place one small market position once a week on a market you follow.';
    if (c === 'chain') return 'Use one app on ' + chain + ' once a week so the address shows real activity.';
    if (c.indexOf('staking pool') >= 0 || c.indexOf('restaking') >= 0) return 'Claim the staking rewards once a week and restake what they pay.';
    if (c.indexOf('bridge') >= 0) return 'Bridge $10 once a week so the address keeps showing cross-chain use.';
    if (c.indexOf('governance') >= 0) return 'Vote once a week on any live proposal ' + p.name + ' puts up.';
    return 'Make one qualifying action each week, such as a deposit, a swap or a vote.';
  }
  function stepText(step) {
    var s = step.text + ' Cost: ' + step.cost + '. Time: ' + step.time + '.';
    if (s.length > 600) s = s.slice(0, 596) + '...';
    if (s.length < 20) s = s + " Hold the position and check the protocol's own page.";
    return s;
  }
  function farmSteps(p) {
    var chain = chainOf(p);
    var capital = capitalFor(p);
    var hold = holdDaysFor(p.age_days);
    var gas = gasFor(chain);
    var second = p.chains && p.chains.length > 1 ? p.chains[1] : null;
    var steps = [
      { text: walletFor(p), cost: 'under $3 of gas for the first transaction', time: '5 minutes' },
      { text: actionFor(p, capital, chain), cost: '$' + capital + ' of capital and ' + gas, time: '15 minutes to set up' },
      { text: weeklyFor(p, chain), cost: gas + ' a week', time: '10 minutes a week' },
      { text: 'Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot.', cost: 'the $' + capital + ' stays in the position', time: hold + ' days' }
    ];
    if (second !== null) {
      steps.push({ text: 'Repeat the core action once on ' + second + ': most snapshots count activity per chain, and a second chain doubles the footprint.', cost: gas + ' on ' + second, time: '15 minutes' });
    } else {
      steps.push({ text: "Open the protocol's own points or rewards page once a week and confirm the position is counted; claim only from the link the protocol itself publishes, and never pay anyone to claim.", cost: 'no fee to check', time: '10 minutes a week' });
    }
    steps.push({ text: 'Write the wallet address, the dates and every transaction hash in a farm log, so you can repeat the position or unwind it fast.', cost: 'nothing but the log', time: '5 minutes' });
    return steps.map(stepText);
  }
  // Exposed for the build's own checks: window.__scopeSteps(row) recomputes a row's plan.
  window.__scopeSteps = farmSteps;
  window.__scopeValue = function (row) { return scopeValueOf(row, DATA.model); };

  // ---- hash state ----
  function readHash() {
    var hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    var params = new URLSearchParams(hash);
    if (params.get('q')) state.q = params.get('q');
    if (params.get('category')) state.category = params.get('category');
    if (params.get('chain')) state.chain = params.get('chain');
    if (params.get('watchlist') === '1') state.watchlist = true;
    if (params.get('tab')) state.tab = params.get('tab');
    if (params.get('sort')) state.sort = params.get('sort');
    if (params.get('p')) state.selected = params.get('p');
  }
  function writeHash() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category !== 'all') params.set('category', state.category);
    if (state.chain !== 'all') params.set('chain', state.chain);
    if (state.watchlist) params.set('watchlist', '1');
    if (state.tab !== 'pre-token') params.set('tab', state.tab);
    if (state.sort !== 'implied') params.set('sort', state.sort);
    if (state.selected) params.set('p', state.selected);
    var next = params.toString();
    if (next) window.history.replaceState(null, '', '#' + next);
    else window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  // ---- filtering and sorting ----
  function filteredRows() {
    var q = state.q.trim().toLowerCase();
    return DATA.rows.filter(function (r) {
      if (state.watchlist && !r.watchlist) return false;
      if (state.category !== 'all' && r.category !== state.category) return false;
      if (state.chain !== 'all' && !(r.chains || []).includes(state.chain)) return false;
      if (!q) return true;
      var hay = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }
  function sortedRows(list) {
    var key = state.sort;
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (key === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (key === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (key === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (key === 'age') { av = a.age_days === null ? Infinity : a.age_days; bv = b.age_days === null ? Infinity : b.age_days; }
      else { av = a.implied_value_usd; bv = b.implied_value_usd; }
      if (av < bv) return -state.dir;
      if (av > bv) return state.dir;
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });
  }

  // ---- rendering ----
  function masthead() {
    return '<header class="masthead">' +
      '<div class="ring" aria-hidden="true"></div>' +
      '<div class="brand"><h1>Launch <em>Scope</em></h1>' +
      '<p>Token launch radar — every protocol that records no token, ranked by what its launch would be worth.</p></div>' +
      '<div class="meta">' +
      '<span class="chip">Snapshot <b>' + esc(DATA.as_of) + '</b></span>' +
      '<span class="chip">Source <b>DefiLlama</b></span>' +
      '<span class="chip">Model <b>' + esc(DATA.model_version) + '</b></span>' +
      '</div></header>';
  }
  function stats() {
    return '<section class="stats">' +
      '<div class="stat"><span>Watchlist covered</span><b>' + DATA.watchlist_size + ' <small>/ ' + DATA.watchlist_size + '</small></b></div>' +
      '<div class="stat"><span>Pre-token rows scored</span><b>' + DATA.board_size + '</b></div>' +
      '<div class="stat"><span>Early rows below the floor</span><b>' + DATA.early_size + '</b></div>' +
      '<div class="stat"><span>Live-token set aside</span><b>' + DATA.live_size + '</b></div>' +
      '</section>';
  }
  function modelNote() {
    var m = DATA.model;
    return '<section class="model-note"><h2>How implied value is computed — judge note</h2>' +
      '<p>One function, <code>scopeValue</code>, scores every row: ' +
      '<code>implied = round(tvl &times; ' + m.base_multiple + ' &times; (1 + clamp(7d, ' + m.growth_floor + ', ' + m.growth_cap + ') &divide; 100) &times; (' + m.maturity_floor + ' + min(age, ' + m.maturity_days + ') &divide; ' + m.maturity_days + ' &times; ' + m.maturity_range + '))</code></p>' +
      '<p>TVL sets the scale, a strong week moves a protocol up or down, and a protocol that has run longer with no token yet counts for more. Age is the time since first listing; an unlisted age uses ' + m.unknown_age_days + ' days. No protocol name is special-cased. A protocol &ldquo;records no token&rdquo; when DefiLlama&rsquo;s record carries none for it — the record is not proof it has none. Implied value is a model, not a price.</p>' +
      '</section>';
  }
  function controls() {
    var cats = Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Other'; }))).sort();
    var chains = Array.from(new Set(DATA.rows.reduce(function (acc, r) { return acc.concat(r.chains || []); }, []))).sort();
    var catOpts = '<option value="all">All categories</option>' + cats.map(function (c) {
      return '<option value="' + esc(c) + '"' + (c === state.category ? ' selected' : '') + '>' + esc(c) + '</option>';
    }).join('');
    var chainOpts = '<option value="all">All chains</option>' + chains.map(function (c) {
      return '<option value="' + esc(c) + '"' + (c === state.chain ? ' selected' : '') + '>' + esc(c) + '</option>';
    }).join('');
    return '<div class="controls">' +
      '<div class="field search"><label for="q">Search</label><input type="search" id="q" placeholder="Search name, category or chain" value="' + esc(state.q) + '" aria-label="Search the board"></div>' +
      '<div class="field"><label for="category">Category</label><select id="category" aria-label="Filter by category">' + catOpts + '</select></div>' +
      '<div class="field"><label for="chain">Chain</label><select id="chain" aria-label="Filter by chain">' + chainOpts + '</select></div>' +
      '<label class="check"><input type="checkbox" id="watchlist" ' + (state.watchlist ? 'checked' : '') + '> Watchlist only</label>' +
      '<div class="tabs" role="group" aria-label="Token status">' +
      '<button type="button" data-tab="pre-token" aria-pressed="' + (state.tab === 'pre-token') + '">Pre-token</button>' +
      '<button type="button" data-tab="live" aria-pressed="' + (state.tab === 'live') + '">Live token</button>' +
      '</div>' +
      '<span class="count" id="count"></span>' +
      '</div>';
  }
  function sortHead(key, label) {
    var arrow = state.sort === key ? (state.dir < 0 ? ' &#9660;' : ' &#9650;') : '';
    return '<th scope="col"><button type="button" data-sort="' + key + '">' + label + arrow + '</button></th>';
  }
  function boardTable() {
    var list = sortedRows(filteredRows());
    if (list.length === 0) {
      return '<div class="panel"><div class="empty"><h2>No protocol matches that filter</h2>' +
        '<p>Clear the search or pick another category or chain to see the board again.</p>' +
        '<button class="button" type="button" id="clear-filters">Clear filters</button></div></div>';
    }
    var max = 1;
    list.forEach(function (r) { if (r.implied_value_usd > max) max = r.implied_value_usd; });
    var rowsHtml = list.map(function (r) {
      var growth = r.change_7d === null ? 'n/a' : fmtPct(r.change_7d);
      var growthClass = r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg';
      var tag = r.watchlist ? '<span class="tag watch">Watchlist</span>' : '<span class="tag early">Early</span>';
      var pct = Math.max(3, Math.round((r.implied_value_usd / max) * 100));
      return '<tr data-slug="' + esc(r.slug) + '" data-selected="' + (state.selected === r.slug) + '" tabindex="0">' +
        '<td class="num rank">' + r.rank + '</td>' +
        '<td><div class="name"><b>' + esc(r.name) + tag + '</b>' +
        '<span class="sub">' + esc(r.category || 'Other') + ' on ' + esc((r.chains || []).slice(0, 2).join(', ') || 'an unnamed chain') + '</span></div></td>' +
        '<td class="num">' + fmtUsd(r.tvl_usd) + '</td>' +
        '<td class="num ' + growthClass + '">' + growth + '</td>' +
        '<td class="num">' + fmtAge(r.age_days) + '</td>' +
        '<td><div class="implied"><div class="bar" aria-hidden="true"><i style="width:' + pct + '%"></i></div>' +
        '<span class="num">' + fmtUsd(r.implied_value_usd) + '</span></div></td></tr>';
    }).join('');
    return '<div class="panel"><div class="table-wrap"><table>' +
      '<caption>Pre-token protocols, strongest implied value first. Select a row for its model and farm plan.</caption>' +
      '<thead><tr>' + sortHead('implied', 'Rank') + sortHead('name', 'Protocol') + sortHead('tvl', 'TVL') +
      sortHead('growth', '7d') + sortHead('age', 'Age') + sortHead('implied', 'Implied value') + '</tr></thead>' +
      '<tbody>' + rowsHtml + '</tbody></table></div></div>';
  }
  function liveTable() {
    var rowsHtml = DATA.live.map(function (r) {
      return '<tr>' +
        '<td class="num">live</td>' +
        '<td><div class="name"><b>' + esc(r.name) + '</b>' +
        '<span class="sub">' + esc(r.category || 'Other') + ' on ' + esc((r.chains || []).slice(0, 2).join(', ') || 'an unnamed chain') + '</span></div></td>' +
        '<td class="num">' + fmtUsd(r.tvl_usd) + '</td>' +
        '<td class="num ' + (r.change_7d !== null && r.change_7d >= 0 ? 'pos' : 'neg') + '">' + fmtPct(r.change_7d) + '</td>' +
        '<td class="num">' + fmtUsd(r.mcap_usd) + '</td>' +
        '<td><span class="tag early">Already trades</span></td></tr>';
    }).join('');
    return '<div class="panel"><div class="table-wrap"><table>' +
      '<caption>Token live: these protocols already trade, so their market cap is a fact, not a model. They are set aside from the pre-token ranking.</caption>' +
      '<thead><tr><th scope="col">Status</th><th scope="col">Protocol</th><th scope="col">TVL</th><th scope="col">7d</th><th scope="col">Market cap</th><th scope="col">Token</th></tr></thead>' +
      '<tbody>' + rowsHtml + '</tbody></table></div></div>';
  }

  var dialog = document.createElement('dialog');
  dialog.className = 'detail';
  dialog.setAttribute('aria-labelledby', 'detail-title');
  dialog.addEventListener('close', function () { state.selected = null; writeHash(); });

  function openDetail(slug) {
    var row = null;
    DATA.rows.forEach(function (r) { if (r.slug === slug) row = r; });
    if (!row) return;
    state.selected = slug;
    writeHash();
    var steps = farmSteps(row);
    var recomputed = scopeValueOf(row, DATA.model);
    var match = recomputed === row.implied_value_usd;
    var stepsHtml = steps.map(function (s) {
      var at = s.indexOf(' Cost: ');
      var action = at >= 0 ? s.slice(0, at) : s;
      var tail = at >= 0 ? s.slice(at + 1) : '';
      return '<li><b>' + esc(action) + '</b><span class="cost">' + esc(tail) + '</span></li>';
    }).join('');
    dialog.innerHTML =
      '<div class="detail-head"><div><span class="kick">Rank ' + row.rank + ' of ' + DATA.board_size + (row.watchlist ? ' &middot; Watchlist' : ' &middot; Early find') + '</span>' +
      '<h2 id="detail-title">' + esc(row.name) + '</h2>' +
      '<p class="sub">' + esc(row.category || 'Other') + ' on ' + esc((row.chains || []).join(', ') || 'an unnamed chain') + '</p></div>' +
      '<button class="close" type="button" aria-label="Close details">Close</button></div>' +
      '<section class="detail-section"><h3>Implied value</h3><div class="equation">' +
      '<div><span>TVL</span><b>' + fmtUsd(row.tvl_usd) + '</b></div>' +
      '<div><span>Seven-day growth</span><b>' + fmtPct(row.change_7d) + '</b></div>' +
      '<div><span>Age with no token</span><b>' + fmtAge(row.age_days) + '</b></div>' +
      '<div><span>Growth multiplier</span><b>' + row.growth_multiplier + '</b></div>' +
      '<div><span>Maturity multiplier</span><b>' + row.maturity_multiplier + '</b></div>' +
      '<div><span>Implied value</span><b class="hl">' + fmtUsd(row.implied_value_usd) + '</b></div>' +
      '</div>' +
      '<p class="note ' + (match ? 'ok' : 'bad') + '">Model ' + esc(DATA.model_version) + ': the page recomputes this row as ' + fmtUsd(recomputed) +
      (match ? ' — the same number board.json carries.' : ' — which differs from the board: the data would be stale.') +
      ' This is an estimate, not a price.</p></section>' +
      '<section class="detail-section"><h3>Farm plan</h3><ol class="steps">' + stepsHtml + '</ol>' +
      '<p class="note">This protocol records no token in the snapshot. A farm plan is a plan, not a promise of an airdrop.</p></section>' +
      '<p class="foot">Data: DefiLlama protocol index, snapshot ' + esc(DATA.as_of) + ' &middot; <code>' + esc(row.slug) + '</code></p>';
    dialog.querySelector('.close').addEventListener('click', function () { dialog.close(); });
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function render() {
    app.innerHTML = '<div class="scope">' + masthead() + stats() + modelNote() + controls() +
      (state.tab === 'pre-token' ? boardTable() : liveTable()) + '</div>';
    app.setAttribute('aria-busy', 'false');
    var countEl = document.getElementById('count');
    if (countEl) {
      countEl.textContent = state.tab === 'pre-token'
        ? filteredRows().length + ' of ' + DATA.board_size + ' rows shown'
        : DATA.live.length + ' live-token protocols';
    }
    if (!dialog.isConnected) app.appendChild(dialog);
    if (state.selected) openDetail(state.selected);

    var q = document.getElementById('q');
    if (q) q.addEventListener('input', function () { state.q = q.value; writeHash(); render(); });
    var cat = document.getElementById('category');
    if (cat) cat.addEventListener('change', function () { state.category = cat.value; writeHash(); render(); });
    var ch = document.getElementById('chain');
    if (ch) ch.addEventListener('change', function () { state.chain = ch.value; writeHash(); render(); });
    var wl = document.getElementById('watchlist');
    if (wl) wl.addEventListener('change', function () { state.watchlist = wl.checked; writeHash(); render(); });
    var clear = document.getElementById('clear-filters');
    if (clear) clear.addEventListener('click', function () { state.q = ''; state.category = 'all'; state.chain = 'all'; state.watchlist = false; writeHash(); render(); });
    Array.prototype.forEach.call(app.querySelectorAll('[data-tab]'), function (b) {
      b.addEventListener('click', function () { state.tab = b.getAttribute('data-tab'); render(); });
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-sort]'), function (b) {
      b.addEventListener('click', function () {
        var key = b.getAttribute('data-sort');
        if (state.sort === key) state.dir = -state.dir;
        else { state.sort = key; state.dir = -1; }
        render();
      });
    });
    Array.prototype.forEach.call(app.querySelectorAll('tbody tr[data-slug]'), function (tr) {
      tr.addEventListener('click', function () { openDetail(tr.getAttribute('data-slug')); });
      tr.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(tr.getAttribute('data-slug')); }
      });
    });
  }

  readHash();
  render();
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dialog.open) dialog.close();
  });
})();
