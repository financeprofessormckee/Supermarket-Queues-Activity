/* Paired evidence for the supermarket teaching model. No changes to routing or time. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./model.js'));
  else root.SupermarketAnalysis = factory(root.SupermarketModel);
})(typeof self !== 'undefined' ? self : this, function (M) {
  'use strict';
  var components = ['search', 'travel', 'wait', 'service', 'total'];
  function times(s) {
    return { search: s.searchTime, travel: s.travel, wait: s.start - s.join,
      service: s.items + 3, total: s.end - s.arrival };
  }
  function mean(values) { return values.length ? values.reduce(function (a, b) { return a + b; }, 0) / values.length : null; }
  function distribution(values) {
    var sorted = values.slice().sort(function (a, b) { return a - b; }), n = sorted.length;
    return { count: n, mean: mean(sorted), median: n ? (sorted[Math.floor((n - 1) / 2)] + sorted[Math.floor(n / 2)]) / 2 : null,
      p90: n ? sorted[Math.ceil(n * 0.9) - 1] : null, max: n ? sorted[n - 1] : null };
  }
  function pairs(state) {
    if (!M.finished(state)) return null;
    var baseline = new Map(state.baseline.completed.map(function (s) { return [s.id, s]; }));
    return state.experiment.completed.map(function (s) {
      var b = baseline.get(s.id), bt = times(b), et = times(s);
      return { id: s.id, items: s.items, source: s.source, arrival: s.arrival, search: s.search,
        baseline: b, experiment: s, baselineTimes: bt, experimentTimes: et, delta: et.total - bt.total };
    }).sort(function (a, b) { return a.id - b.id; });
  }
  function cohort(rows, cutoff, group) {
    return rows.filter(function (s) {
      return group === 'search' ? s.search : group === 'nonsearch' ? !s.search :
        group === 'eligible' ? s.items <= cutoff : group === 'ineligible' ? s.items > cutoff : true;
    });
  }
  function summarize(rows) {
    var deltas = {};
    components.forEach(function (k) { deltas[k] = mean(rows.map(function (s) { return s.experimentTimes[k] - s.baselineTimes[k]; })); });
    return { count: rows.length, baseline: distribution(rows.map(function (s) { return s.baselineTimes.total; })),
      experiment: distribution(rows.map(function (s) { return s.experimentTimes.total; })), delta: deltas,
      faster: rows.filter(function (s) { return s.delta < 0; }).length,
      same: rows.filter(function (s) { return s.delta === 0; }).length,
      slower: rows.filter(function (s) { return s.delta > 0; }).length };
  }
  function result(state, group) {
    var rows = pairs(state);
    return rows === null ? null : summarize(cohort(rows, state.params.cutoff, group));
  }
  // This is a reproducible seed sequence, not a claim of independent random samples.
  function seedFor(seed, index) {
    if (M.validate(seed, 'seed') || !Number.isInteger(index) || index < 0) throw new RangeError('Invalid seed sequence.');
    return 1 + (Number(seed) - 1 + index) % M.LIMITS.seed[1];
  }
  function trial(state) {
    var r = result(state);
    if (!r) throw new Error('Drain both stores before recording a trial.');
    return { seed: state.params.seed, count: r.count, baseline: r.baseline.mean, experiment: r.experiment.mean, delta: r.delta.total };
  }
  function trialsSummary(rows) {
    var valid = rows.filter(function (r) { return r.count > 0; }), values = valid.map(function (r) { return r.delta; });
    return { count: valid.length, empty: rows.length - valid.length, mean: mean(values),
      min: values.length ? Math.min.apply(null, values) : null, max: values.length ? Math.max.apply(null, values) : null,
      faster: values.filter(function (v) { return v < 0; }).length, same: values.filter(function (v) { return v === 0; }).length,
      slower: values.filter(function (v) { return v > 0; }).length };
  }
  function csv(rows) {
    return rows.map(function (row) { return row.map(function (v) {
      return '"' + (v === null || v === undefined ? '' : String(v)).replace(/"/g, '""') + '"';
    }).join(','); }).join('\r\n') + '\r\n';
  }
  var settings = ['seed', 'arrival', 'horizon', 'share', 'depth', 'cost', 'express', 'cutoff'];
  function comparisonCSV(state) {
    var rows = pairs(state);
    if (rows === null) throw new Error('Finish the comparison before exporting.');
    var header = settings.concat(['shopper_id', 'basket_items', 'source_lane', 'arrival_tick', 'experiment_searcher',
      'baseline_lane', 'experiment_lane']);
    ['baseline', 'experiment'].forEach(function (store) { components.forEach(function (k) { header.push(store + '_' + k); }); });
    header.push('experiment_minus_baseline');
    return csv([header].concat(rows.map(function (r) {
      return settings.map(function (k) { return state.params[k]; }).concat([r.id, r.items, r.source + 1, r.arrival, r.search,
        r.baseline.lane + 1, r.experiment.lane + 1], components.map(function (k) { return r.baselineTimes[k]; }),
      components.map(function (k) { return r.experimentTimes[k]; }), [r.delta]);
    })));
  }
  function trialsCSV(params, rows) {
    return csv([settings.concat(['shoppers', 'baseline_mean', 'experiment_mean', 'experiment_minus_baseline'])].concat(rows.map(function (r) {
      return settings.map(function (k) { return k === 'seed' ? r.seed : params[k]; }).concat([r.count, r.baseline, r.experiment, r.delta]);
    })));
  }
  return { times: times, distribution: distribution, pairs: pairs, cohort: cohort, summarize: summarize, result: result,
    seedFor: seedFor, trial: trial, trialsSummary: trialsSummary, comparisonCSV: comparisonCSV, trialsCSV: trialsCSV };
});
