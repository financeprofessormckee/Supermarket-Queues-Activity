(function (root) {
  'use strict';
  var M = root.SupermarketModel, A = root.SupermarketAnalysis;
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, text, cls) { var node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (cls) node.className = cls; return node; }
  function number(n) { return n === null ? '—' : n.toFixed(2); }
  function signed(n) { return n === null ? '—' : (n > 0 ? '+' : '') + number(n); }
  function metric(label, value, note, cls) {
    var article = el('div', undefined, 'metric' + (cls ? ' ' + cls : ''));
    article.append(el('span', label, 'metric-label'), el('strong', value, 'metric-value'), el('span', note, 'metric-note')); return article;
  }
  function row(body, cells) {
    var tr = el('tr'); cells.forEach(function (value, i) { var cell = el(i ? 'td' : 'th', value); if (!i) cell.scope = 'row'; tr.appendChild(cell); }); body.appendChild(tr);
  }
  function breakdown(state, result) {
    var area = $('time-breakdown'); area.replaceChildren();
    if (!result.count) return;
    area.appendChild(el('h3', 'Where the time goes'));
    var max = Math.max(result.baseline.mean, result.experiment.mean);
    [state.baseline, state.experiment].forEach(function (run) {
      var stats = M.stats(run, state.params.cutoff), title = run.experiment ? 'Experiment' : 'Baseline';
      var entry = el('div', undefined, 'breakdown-row'), bar = el('div', undefined, 'stacked-bar');
      entry.appendChild(el('strong', title + ' · ' + number(stats.total) + ' units'));
      bar.setAttribute('role', 'img'); bar.setAttribute('aria-label', title + ': search ' + number(stats.search) + ', travel ' + number(stats.travel) + ', queue wait ' + number(stats.wait) + ', service ' + number(stats.service) + ' units.');
      ['search', 'travel', 'wait', 'service'].forEach(function (k) {
        var segment = el('span', undefined, 'time-segment segment-' + k); segment.style.width = (stats[k] / max * 100) + '%';
        segment.setAttribute('aria-hidden', 'true'); bar.appendChild(segment);
      });
      entry.appendChild(bar); area.appendChild(entry);
    });
    var legend = el('ul', undefined, 'time-legend');
    [['search', 'Search'], ['travel', 'Travel'], ['wait', 'Queue wait'], ['service', 'Service']].forEach(function (pair) {
      var item = el('li'), swatch = el('span', undefined, 'swatch segment-' + pair[0]); swatch.setAttribute('aria-hidden', 'true');
      item.append(swatch, document.createTextNode(pair[1] + ': ' + signed(result.delta[pair[0]]) + ' units')); legend.appendChild(item);
    });
    area.append(legend, el('p', 'Component changes are experiment minus baseline. Both bars share the same scale. Service is identical after every shopper finishes.', 'help'));
  }
  function results(state) {
    var r = A.result(state), metrics = $('outcome-metrics'), paired = document.querySelector('#paired-table tbody');
    metrics.replaceChildren(); paired.replaceChildren(); $('time-breakdown').replaceChildren();
    $('export-comparison').disabled = !r || !r.count;
    if (!r) {
      var admitted = state.baseline.admitted;
      $('outcome-status').textContent = state.tick < 0 ? 'Make a prediction, then run the comparison. Which policy will reduce total exit time?' :
        'Still in progress: ' + state.baseline.completed.length + '/' + admitted + ' baseline and ' + state.experiment.completed.length + '/' + admitted + ' experiment shoppers finished. Final policy effects appear after both stores drain.';
      $('paired-status').textContent = 'Matched comparisons appear only after every shopper finishes.'; return;
    }
    if (!r.count) {
      $('outcome-status').textContent = 'No shoppers arrived. There is no average or policy effect to compare.';
      $('paired-status').textContent = 'No matched shoppers in this run.'; return;
    }
    var direction = r.delta.total < 0 ? 'faster' : r.delta.total > 0 ? 'slower' : 'unchanged';
    $('outcome-status').textContent = 'Final · ' + r.count + ' matched shoppers · the experiment is ' + direction + ' on average for this seed.';
    metrics.append(metric('Baseline mean', number(r.baseline.mean), 'total exit time · units'),
      metric('Experiment mean', number(r.experiment.mean), 'total exit time · units'),
      metric('Policy change', signed(r.delta.total), (r.delta.total === 0 ? 'No change' : number(Math.abs(r.delta.total) / r.baseline.mean * 100) + '% ' + direction) + ' · this seed only', 'metric-emphasis'),
      metric('Experiment 90th percentile', number(r.experiment.p90), 'Baseline: ' + number(r.baseline.p90) + ' units'));
    breakdown(state, r);
    $('paired-status').textContent = r.faster + ' shoppers finish faster, ' + r.same + ' tie, and ' + r.slower + ' finish slower in the experiment.';
    [['all', 'All shoppers'], ['search', 'Assigned to search'], ['nonsearch', 'Assigned not to search'],
      ['eligible', 'Baskets ≤ ' + state.params.cutoff], ['ineligible', 'Baskets > ' + state.params.cutoff]].forEach(function (pair) {
      var group = A.result(state, pair[0]);
      row(paired, [pair[1], group.count, number(group.baseline.mean), number(group.experiment.mean), signed(group.delta.total), group.count ? group.faster + ' / ' + group.same + ' / ' + group.slower : 'No shoppers']);
    });
  }
  function trials(rows, complete) {
    var table = document.querySelector('#repeat-table tbody'), area = $('repeat-results'); table.replaceChildren(); area.replaceChildren();
    rows.forEach(function (r) { row(table, [r.seed, r.count, number(r.baseline), number(r.experiment), signed(r.delta)]); });
    if (!rows.length) return;
    var summary = A.trialsSummary(rows);
    if (!summary.count) { area.appendChild(el('p', 'No shoppers in the completed trials; no policy comparison is available.')); return; }
    var grid = el('div', undefined, 'metrics');
    grid.append(metric(complete ? 'Mean change across seeds' : 'Partial mean across completed seeds', signed(summary.mean), 'Each nonempty seed has equal weight.'),
      metric('Experiment faster in', summary.faster + ' / ' + summary.count, summary.same + ' tied · ' + summary.slower + ' slower'),
      metric('Observed change range', signed(summary.min) + ' to ' + signed(summary.max), 'time units per shopper'));
    area.append(grid, el('p', summary.empty + ' empty trials excluded. The table identifies the exact seeds; this summary does not establish a universal ranking.', 'help'));
  }
  root.SupermarketLabView = { results: results, trials: trials };
})(typeof self !== 'undefined' ? self : this);
