/* Economic concepts: David Friedman. Development: Eric McKee.
   Fresh, deterministic queue model; timing choices documented in SPECIFICATION.md. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SupermarketModel = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var LIMITS = { seed: [1, 2147483647, 1], arrival: [0, 30, 1], horizon: [100, 1200, 100],
    share: [0, 100, 1], depth: [2, 4, 1], cost: [0, 8, 1], cutoff: [1, 30, 1] };
  var PROMPTS = {
    balance: { title: '1. Follow queue balancing', question: 'Why can a shorter nearby line attract the next shopper?', answer: 'shorter',
      options: [['shorter', 'The shopper compares visible people counts'], ['equal', 'All lines must always have equal lengths'], ['forecast', 'Every shopper knows future arrivals']],
      explanation: 'New shoppers compare the two nearest eligible lines. A shorter visible line attracts shoppers, providing negative feedback; different baskets and arrival locations prevent exact equality.' },
    cheap: { title: '2. Look beyond people counts', question: 'What information do searchers use that a people count misses?', answer: 'workload',
      options: [['workload', 'Basket workloads and remaining service time'], ['future', 'The exact future arrival stream'], ['guarantee', 'A guarantee that every searcher finishes sooner']],
      explanation: 'A few large baskets can take longer than several small ones. Searchers forecast from current workload, but later arrivals can invalidate that forecast. Cheap information slightly lowers the overall average in this example.' },
    costly: { title: '3. Count the cost of search', question: 'What happens when every shopper pays eight units per inspected lane?', answer: 'cost',
      options: [['cost', 'Search costs outweigh the savings in this example'], ['free', 'Searching consumes no time'], ['always', 'Inspecting more lines always improves total exit time']],
      explanation: 'The 32-unit inspection cost belongs in total exit time. This example takes longer overall than the baseline, even though searchers can observe more information.' },
    express: { title: '4. Test express checkout', question: 'Does reserving a lane guarantee a lower store-wide average?', answer: 'tradeoff',
      options: [['tradeoff', 'No; eligibility changes how capacity is shared'], ['always', 'Yes; express checkout always improves every basket'], ['same', 'The restriction cannot affect other lanes']],
      explanation: 'Larger baskets cannot use lane 4. Reserving capacity changes congestion elsewhere; the overall average rises in this example. Compare the eligible and ineligible cohorts before choosing a policy.' }
  };
  function initial() { return { seed: 20261002, arrival: 18, horizon: 600, share: 50, depth: 4, cost: 1, cutoff: 10, express: false }; }
  function validate(value, key) {
    var lim = LIMITS[key];
    if (!lim) return 'Unknown parameter.';
    if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '' || !Number.isFinite(Number(value))) return 'Enter a finite whole number.';
    var n = Number(value);
    if (n < lim[0] || n > lim[1]) return 'Use a value from ' + lim[0] + ' to ' + lim[1] + '.';
    if (!Number.isInteger(n) || n % lim[2] !== 0) return 'Use whole-number steps of ' + lim[2] + '.';
    return '';
  }
  function validateParameters(p) {
    var errors = {};
    Object.keys(LIMITS).forEach(function (k) { var error = validate(p && p[k], k); if (error) errors[k] = error; });
    if (!p || typeof p.express !== 'boolean') errors.express = 'Choose whether to reserve the express lane.';
    return errors;
  }
  function parameters(p) {
    if (Object.keys(validateParameters(p)).length) throw new RangeError('Invalid supermarket settings.');
    var copy = { express: p.express }; Object.keys(LIMITS).forEach(function (k) { copy[k] = Number(p[k]); }); return copy;
  }
  function preset(id) {
    var p = initial();
    if (id === 'balance') p.share = 0;
    else if (id === 'costly') { p.share = 100; p.cost = 8; }
    else if (id === 'express') p.express = true;
    else if (id !== 'cheap') throw new RangeError('Unknown scenario.');
    return p;
  }
  function stream(p) {
    p = parameters(p); var x = p.seed >>> 0, shoppers = [];
    function draw() { x = (Math.imul(1664525, x) + 1013904223) >>> 0; return x / 4294967296; }
    for (var t = 0; t < p.horizon; t++) {
      var r = draw(), items = 1 + Math.floor(draw() * 30), source = draw() < 0.5 ? 0 : 3, group = draw();
      if (r < p.arrival / 100) shoppers.push({ id: shoppers.length + 1, arrival: t, items: items, source: source, group: group });
    }
    return shoppers;
  }
  function workload(lane, tick) {
    return (lane.active ? Math.max(0, lane.active.end - tick) : 0) + lane.queue.reduce(function (sum, s) { return sum + s.items + 3; }, 0);
  }
  function choose(p, run, shopper, tick) {
    var search = run.experiment && shopper.group < p.share / 100;
    var eligible = [0, 1, 2, 3].filter(function (i) { return !(run.experiment && p.express && i === 3 && shopper.items > p.cutoff); });
    function proximity(i, j) { return Math.abs(i - shopper.source) - Math.abs(j - shopper.source) || i - j; }
    eligible.sort(proximity);
    var inspected = eligible.slice(0, search ? p.depth : 2), h = search ? inspected.length * p.cost : 0;
    var candidates = inspected.map(function (i) {
      var lane = run.lanes[i], travel = 3 + Math.abs(i - shopper.source), w = workload(lane, tick);
      return { lane: i, count: lane.queue.length + (lane.active ? 1 : 0), workload: w, travel: travel,
        prediction: h + travel + Math.max(0, w - h - travel) + shopper.items + 3 };
    });
    var ranked = candidates.slice().sort(function (a, b) {
      return (search ? a.prediction - b.prediction : a.count - b.count) || proximity(a.lane, b.lane);
    });
    var selected = ranked[0];
    return Object.assign({}, shopper, { search: search, lane: selected.lane, searchTime: h, travel: selected.travel,
      join: tick + h + selected.travel, prediction: selected.prediction, candidates: candidates });
  }
  function newRun(experiment) {
    return { experiment: experiment, admitted: 0, pending: [], completed: [], lastDecision: null,
      lanes: [0, 1, 2, 3].map(function () { return { active: null, queue: [] }; }), history: [] };
  }
  function start(p) { p = parameters(p); return { params: p, shoppers: stream(p), nextArrival: 0, tick: -1, baseline: newRun(false), experiment: newRun(true) }; }
  function unfinished(run) { return run.pending.length + run.lanes.reduce(function (n, l) { return n + l.queue.length + (l.active ? 1 : 0); }, 0); }
  function finished(state) { return state.tick >= state.params.horizon - 1 && unfinished(state.baseline) === 0 && unfinished(state.experiment) === 0; }
  function laneRows(run, tick) {
    return run.lanes.map(function (l, i) { return { lane: i + 1, people: l.queue.length + (l.active ? 1 : 0), waiting: l.queue.length,
      serving: l.active ? l.active.id : null, remaining: l.active ? Math.max(0, l.active.end - tick) : 0, workload: workload(l, tick) }; });
  }
  // Include the live endpoint in both the chart and its equivalent table.
  // Keep recorded history immutable when the current tick is between samples.
  function historySamples(run, tick) {
    var history = run.history;
    if (tick >= 0 && (!history.length || history[history.length - 1].tick !== tick)) {
      return history.concat([{ tick: tick, lanes: laneRows(run, tick) }]);
    }
    return history;
  }
  function nextRun(p, old, arrivals, tick) {
    var run = Object.assign({}, old, { pending: old.pending.slice(), completed: old.completed.slice(),
      lanes: old.lanes.map(function (l) { return { active: l.active, queue: l.queue.slice() }; }) });
    run.lanes.forEach(function (lane) {
      if (lane.active && lane.active.end === tick) {
        run.completed.push(lane.active); lane.active = null;
      }
    });
    arrivals.forEach(function (shopper) { var s = choose(p, run, shopper, tick); run.pending.push(s); run.admitted++; run.lastDecision = s; });
    var joining = run.pending.filter(function (s) { return s.join === tick; }).sort(function (a, b) { return a.id - b.id; });
    run.pending = run.pending.filter(function (s) { return s.join !== tick; });
    joining.forEach(function (s) { run.lanes[s.lane].queue.push(s); });
    run.lanes.forEach(function (lane) {
      if (!lane.active && lane.queue.length) {
        var s = lane.queue.shift(); lane.active = Object.assign({}, s, { start: tick, end: tick + s.items + 3 });
      }
    });
    if (tick % 10 === 0 || tick === p.horizon - 1 || (tick >= p.horizon - 1 && unfinished(run) === 0 && unfinished(old) > 0)) {
      run.history = old.history.concat([{ tick: tick, lanes: laneRows(run, tick) }]);
    }
    return run;
  }
  function advance(state) {
    if (finished(state)) return state;
    var tick = state.tick + 1, index = state.nextArrival, arrivals = [];
    while (index < state.shoppers.length && state.shoppers[index].arrival === tick) arrivals.push(state.shoppers[index++]);
    return Object.assign({}, state, { tick: tick, nextArrival: index,
      baseline: nextRun(state.params, state.baseline, arrivals, tick), experiment: nextRun(state.params, state.experiment, arrivals, tick) });
  }
  function advanceMany(state, count) { for (var i = 0; i < count && !finished(state); i++) state = advance(state); return state; }
  function stats(run, cutoff, group) {
    var rows = run.completed.filter(function (s) {
      return !group || group === 'all' || (group === 'search' && s.search) || (group === 'nonsearch' && !s.search) ||
        (group === 'eligible' && s.items <= cutoff) || (group === 'ineligible' && s.items > cutoff);
    });
    var result = { count: rows.length, search: null, travel: null, wait: null, service: null, total: null };
    if (!rows.length) return result;
    ['search', 'travel', 'wait', 'service', 'total'].forEach(function (k) {
      result[k] = rows.reduce(function (sum, s) {
        return sum + (k === 'search' ? s.searchTime : k === 'travel' ? s.travel : k === 'wait' ? s.start - s.join : k === 'service' ? s.items + 3 : s.end - s.arrival);
      }, 0) / rows.length;
    });
    return result;
  }
  function shopperRows(run, tick) {
    var rows = run.completed.map(function (s) { return Object.assign({}, s, { phase: 'Completed' }); });
    run.pending.forEach(function (s) { rows.push(Object.assign({}, s, { phase: tick < s.arrival + s.searchTime ? 'Searching' : 'Travelling' })); });
    run.lanes.forEach(function (l) {
      l.queue.forEach(function (s) { rows.push(Object.assign({}, s, { phase: 'Waiting' })); });
      if (l.active) rows.push(Object.assign({}, l.active, { phase: 'In service' }));
    });
    return rows.sort(function (a, b) { return a.id - b.id; });
  }
  function checkPrompt(id, state, answer) {
    if (!PROMPTS[id]) return { correct: false, message: 'Choose a guided experiment first.' };
    var expected = preset(id);
    if (Object.keys(expected).some(function (k) { return state.params[k] !== expected[k]; })) return { correct: false, message: 'Reload this guided experiment to use its exact settings.' };
    if (!finished(state)) return { correct: false, message: 'Finish the comparison, including every unfinished shopper, before checking.' };
    if (answer !== PROMPTS[id].answer) return { correct: false, message: 'Look at the decision explanation and the complete time components, then try again.' };
    var b = stats(state.baseline, expected.cutoff), e = stats(state.experiment, expected.cutoff);
    var observed = b.count === 101 && e.count === 101 && (id === 'balance' ? b.total === e.total : id === 'cheap' ? e.total < b.total : e.total > b.total);
    if (!observed) return { correct: false, message: 'The expected scenario result is unavailable; restart this experiment.' };
    return { correct: true, message: 'Complete. ' + PROMPTS[id].explanation };
  }
  return { LIMITS: LIMITS, PROMPTS: PROMPTS, initial: initial, validate: validate, validateParameters: validateParameters, parameters: parameters,
    preset: preset, stream: stream, workload: workload, choose: choose, start: start, advance: advance, advanceMany: advanceMany,
    finished: finished, unfinished: unfinished, stats: stats, laneRows: laneRows, historySamples: historySamples, shopperRows: shopperRows, checkPrompt: checkPrompt };
});
