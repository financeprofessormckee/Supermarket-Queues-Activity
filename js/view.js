/* Economic concepts: David Friedman. Development: Eric McKee. */
(function (root) {
  'use strict';
  var M = root.SupermarketModel, NS = 'http://www.w3.org/2000/svg';
  var colors = ['#5c0025', '#1a5a9e', '#1d6b35', '#9a4a00'], dashes = ['', '9 4', '2 4', '10 3 2 3'];
  function el(tag, text, className) { var n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; }
  function svgEl(tag, attrs, text) { var n = document.createElementNS(NS, tag); Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); }); if (text !== undefined) n.textContent = text; return n; }
  function num(n) { return n === null || n === undefined ? '—' : n.toFixed(2); }
  function name(run) { return run.experiment ? 'Experiment' : 'Baseline'; }
  function runs(state) { return [state.baseline, state.experiment]; }
  function row(body, values) {
    var tr = el('tr'); values.forEach(function (v, i) { var td = el(i ? 'td' : 'th', v); if (!i) td.scope = 'row'; tr.appendChild(td); }); body.appendChild(tr); return tr;
  }
  function stores(state) {
    var frag = document.createDocumentFragment();
    runs(state).forEach(function (run) {
      var article = el('article', undefined, 'store'); article.appendChild(el('h3', name(run)));
      article.appendChild(el('p', run.admitted + ' admitted · ' + run.completed.length + ' completed · ' + M.unfinished(run) + ' unfinished', 'lane-summary'));
      var searching = run.pending.filter(function (s) { return state.tick < s.arrival + s.searchTime; }).length;
      article.appendChild(el('p', searching + ' searching · ' + (run.pending.length - searching) + ' travelling · sources at lanes 1 and 4', 'lane-summary'));
      var grid = el('div', undefined, 'lane-grid');
      run.lanes.forEach(function (l, i) {
        var express = run.experiment && state.params.express && i === 3;
        var lane = el('div', undefined, 'lane' + (express ? ' express-lane' : '')); lane.dataset.lane = i + 1;
        lane.appendChild(el('h4', 'Lane ' + (i + 1) + (express ? ' · express ≤' + state.params.cutoff : ' · ordinary')));
        lane.appendChild(el('p', l.active ? 'Serving #' + l.active.id + ': ' + l.active.items + ' items; ' + (l.active.end - state.tick) + ' units left' : 'Idle', 'serving'));
        lane.appendChild(el('p', l.queue.length + ' waiting · workload ' + M.workload(l, state.tick), 'lane-summary'));
        var list = el('ol', undefined, 'baskets'); list.setAttribute('aria-label', 'Waiting basket sizes in order');
        l.queue.slice(0, 6).forEach(function (s) { list.appendChild(el('li', '#' + s.id + ': ' + s.items + ' items')); });
        if (l.queue.length > 6) list.appendChild(el('li', '+ ' + (l.queue.length - 6) + ' more'));
        lane.appendChild(list); grid.appendChild(lane);
      });
      article.appendChild(grid); frag.appendChild(article);
    });
    document.getElementById('stores').replaceChildren(frag);
  }
  function summary(state) {
    var frag = document.createDocumentFragment(), labels = { all: 'All shoppers', search: 'Searching', nonsearch: 'Non-searching', eligible: 'Basket ≤ ' + state.params.cutoff, ineligible: 'Basket > ' + state.params.cutoff };
    runs(state).forEach(function (run) { Object.keys(labels).forEach(function (group) {
      var s = M.stats(run, state.params.cutoff, group);
      if (!s.count) row(frag, [name(run) + ' / ' + labels[group], 0, 'No completed shoppers', '—', '—', '—', '—']);
      else row(frag, [name(run) + ' / ' + labels[group], s.count, num(s.search), num(s.travel), num(s.wait), num(s.service), num(s.total)]);
    }); });
    document.querySelector('#summary-table tbody').replaceChildren(frag);
    var b = M.stats(state.baseline, state.params.cutoff), e = M.stats(state.experiment, state.params.cutoff);
    var text = M.finished(state) ? 'Final: every admitted shopper has finished.' : 'Provisional: ' + M.unfinished(state.baseline) + ' baseline and ' + M.unfinished(state.experiment) + ' experiment shoppers are unfinished; future arrivals may also remain.';
    if (b.count && e.count) text += ' Mean total exit: baseline ' + num(b.total) + ', experiment ' + num(e.total) + ' units.';
    if (M.finished(state) && b.count) text += ' Experiment minus baseline: ' + num(e.total - b.total) + ' units per shopper (negative means faster). This ranking belongs to this scenario.';
    if (M.finished(state) && !b.count) text += ' No shoppers arrived, so no average or policy comparison is available.';
    document.getElementById('comparison-summary').textContent = text;
  }
  function histories(state) {
    var frag = document.createDocumentFragment(), all = runs(state).map(function (run) { return M.historySamples(run, state.tick); });
    var xmax = Math.max(10, state.tick), ymax = 10;
    all.forEach(function (a) { a.forEach(function (s) { s.lanes.forEach(function (l) { ymax = Math.max(ymax, l.workload); }); }); });
    ymax = Math.ceil(ymax / 10) * 10;
    runs(state).forEach(function (run, index) {
      var article = el('article', undefined, 'history'); article.appendChild(el('h3', name(run)));
      var id = 'history-' + index, svg = svgEl('svg', { viewBox: '0 0 560 300', role: 'img', 'aria-labelledby': id + '-title ' + id + '-desc' });
      svg.appendChild(svgEl('title', { id: id + '-title' }, name(run) + ' lane workload history'));
      svg.appendChild(svgEl('desc', { id: id + '-desc' }, 'Four numbered lanes, shared scales: ticks 0 to ' + xmax + ', workload 0 to ' + ymax + '. Equivalent recorded values are in the workload table; current values are in the store cards.'));
      function x(t) { return 55 + t / xmax * 480; } function y(w) { return 237 - w / ymax * 180; }
      for (var j = 0; j <= 4; j++) {
        var v = ymax * j / 4;
        svg.appendChild(svgEl('line', { x1: 55, x2: 535, y1: y(v), y2: y(v), stroke: '#767676', 'stroke-width': 0.6 }));
        svg.appendChild(svgEl('text', { x: 48, y: y(v) + 5, 'text-anchor': 'end', fill: '#2a2a2a', 'font-size': 14 }, String(v)));
      }
      svg.appendChild(svgEl('text', { x: 55, y: 32, fill: '#2a2a2a', 'font-size': 15 }, 'Workload (time units)'));
      [0, Math.floor(xmax / 2), xmax].forEach(function (v) { svg.appendChild(svgEl('text', { x: x(v), y: 260, 'text-anchor': 'middle', fill: '#2a2a2a', 'font-size': 14 }, String(v))); });
      svg.appendChild(svgEl('text', { x: 295, y: 285, 'text-anchor': 'middle', fill: '#2a2a2a', 'font-size': 15 }, 'Tick'));
      colors.forEach(function (color, i) {
        var points = all[index].map(function (s) { return x(s.tick) + ',' + y(s.lanes[i].workload); }).join(' ');
        if (points) svg.appendChild(svgEl('polyline', { points: points, fill: 'none', stroke: color, 'stroke-width': 2.5, 'stroke-dasharray': dashes[i] }));
        var lx = 60 + i * 120;
        svg.appendChild(svgEl('line', { x1: lx, x2: lx + 23, y1: 11, y2: 11, stroke: color, 'stroke-width': 3, 'stroke-dasharray': dashes[i] }));
        svg.appendChild(svgEl('text', { x: lx + 28, y: 16, fill: '#2a2a2a', 'font-size': 14 }, 'Lane ' + (i + 1)));
      });
      article.appendChild(svg); frag.appendChild(article);
    });
    document.getElementById('histories').replaceChildren(frag);
  }
  function historyTable(state) {
    var frag = document.createDocumentFragment();
    runs(state).forEach(function (run) { M.historySamples(run, state.tick).forEach(function (s) { row(frag, [name(run) + ' / ' + s.tick].concat(s.lanes.map(function (l) { return l.workload; }))); }); });
    document.querySelector('#history-table tbody').replaceChildren(frag);
  }
  function shopperTable(state) {
    var frag = document.createDocumentFragment();
    runs(state).forEach(function (run) { M.shopperRows(run, state.tick).forEach(function (s) {
      var done = s.phase === 'Completed', started = s.start !== undefined;
      row(frag, [name(run) + ' / #' + s.id, s.items, s.source + 1, s.search ? 'Yes' : 'No', s.lane + 1, s.phase,
        s.arrival, s.join, started ? s.start : '—', done ? s.end : '—', s.searchTime, s.travel,
        started ? s.start - s.join : '—', done ? s.items + 3 : '—', done ? s.end - s.arrival : '—']);
    }); });
    document.querySelector('#shopper-table tbody').replaceChildren(frag);
  }
  function decisions(state) {
    var frag = document.createDocumentFragment();
    runs(state).forEach(function (run) {
      var article = el('article', undefined, 'decision'), s = run.lastDecision; article.appendChild(el('h3', name(run) + ' · latest choice'));
      if (!s) article.appendChild(el('p', 'No shopper has arrived yet.'));
      else {
        article.appendChild(el('p', 'Shopper #' + s.id + ', ' + s.items + ' items, source ' + (s.source + 1) + ', arrival ' + s.arrival + ': chose lane ' + (s.lane + 1) + '.'));
        var list = el('ul');
        s.candidates.forEach(function (c) { list.appendChild(el('li', 'Lane ' + (c.lane + 1) + ': ' + c.count + ' people' + (s.search ? ', workload ' + c.workload + ', predicted exit duration ' + c.prediction : '') + '.')); });
        article.appendChild(list);
        article.appendChild(el('p', s.search ? 'Inspection costs ' + s.searchTime + ' and travel costs ' + s.travel + ' units. Forecast = search + travel + remaining workload after that delay + own service. It excludes shoppers still searching or travelling, as well as future arrivals.' : 'Compared two nearby people counts; no paid inspection. Travel costs ' + s.travel + ' units. Basket workloads are visible to you, but this shopper does not use them.'));
      }
      frag.appendChild(article);
    });
    document.getElementById('decisions').replaceChildren(frag);
  }
  function render(state) {
    stores(state); summary(state); histories(state); decisions(state);
    if (document.getElementById('history-details').open) historyTable(state);
    if (document.getElementById('shopper-details').open) shopperTable(state);
  }
  root.SupermarketView = { render: render, historyTable: historyTable, shopperTable: shopperTable };
})(typeof self !== 'undefined' ? self : this);
