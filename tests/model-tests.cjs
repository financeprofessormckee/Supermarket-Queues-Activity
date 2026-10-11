'use strict';
const M = require('../js/model.js');
let checks = 0;
function ok(value, message) { checks++; if (!value) throw new Error(message); }
function equal(a, b, message) { ok(JSON.stringify(a) === JSON.stringify(b), message); }
function close(a, b, message) { ok(Math.abs(a - b) < 1e-9, message + ': ' + a + ' / ' + b); }
function params(values) { return Object.assign(M.initial(), values); }
function drain(state) {
  const bound = state.params.horizon + 38 + 33 * state.shoppers.length;
  while (!M.finished(state) && state.tick < bound) state = M.advanceMany(state, 200);
  ok(M.finished(state), 'Drains within the conservative bound'); return state;
}
function injected(shoppers, values = {}) { const s = M.start(params(Object.assign({ arrival: 0 }, values))); s.shoppers = shoppers; return s; }
function shopper(id, arrival, items, source = 0, group = .25) { return { id, arrival, items, source, group }; }

// Independent BigInt recurrence tests the unsigned-overflow generator and draw consumption.
function referenceStream(p) {
  let x = BigInt(p.seed), list = [];
  const rand = () => { x = (1664525n * x + 1013904223n) % 4294967296n; return Number(x) / 4294967296; };
  for (let tick = 0; tick < p.horizon; tick++) {
    const admitted = rand() < p.arrival / 100, items = 1 + Math.floor(30 * rand()), source = rand() < .5 ? 0 : 3, group = rand();
    if (admitted) list.push(shopper(list.length + 1, tick, items, source, group));
  }
  return list;
}

// Separate mutable event ledger, not calls to model choice/transition/statistics helpers.
function referenceRun(p, arrivals, experiment) {
  const waiting = [[], [], [], []], serving = [null, null, null, null], enRoute = [], completed = [];
  let tick = 0, next = 0;
  while (next < arrivals.length || enRoute.length || waiting.some(q => q.length) || serving.some(Boolean) || tick < p.horizon) {
    serving.forEach((s, i) => { if (s && s.end === tick) { completed.push(s); serving[i] = null; } });
    while (next < arrivals.length && arrivals[next].arrival === tick) {
      const a = arrivals[next++], search = experiment && a.group < p.share / 100;
      const lanes = [0, 1, 2, 3].filter(i => !(experiment && p.express && i === 3 && a.items > p.cutoff));
      lanes.sort((i, j) => Math.abs(a.source - i) - Math.abs(a.source - j) || i - j);
      const candidates = lanes.slice(0, search ? p.depth : 2), searchTime = search ? candidates.length * p.cost : 0;
      let winner = null, best = Infinity;
      for (const i of candidates) {
        const travel = 3 + Math.abs(a.source - i);
        let score = waiting[i].length + Number(!!serving[i]);
        if (search) {
          let availableAt = tick + (serving[i] ? serving[i].end - tick : 0);
          for (const s of waiting[i]) availableAt += s.items + 3;
          score = Math.max(tick + searchTime + travel, availableAt) + a.items + 3 - tick;
        }
        if (score < best) { best = score; winner = i; }
      }
      const travel = 3 + Math.abs(a.source - winner);
      enRoute.push({ ...a, search, searchTime, travel, lane: winner, join: tick + searchTime + travel });
    }
    const joining = enRoute.filter(s => s.join === tick).sort((a, b) => a.id - b.id);
    for (const s of joining) { waiting[s.lane].push(s); enRoute.splice(enRoute.indexOf(s), 1); }
    for (let i = 0; i < 4; i++) if (!serving[i] && waiting[i].length) {
      const s = waiting[i].shift(); serving[i] = { ...s, start: tick, end: tick + s.items + 3 };
    }
    tick++;
    if (tick > p.horizon + 38 + 33 * arrivals.length) throw new Error('Reference failed to drain');
  }
  return completed.sort((a, b) => a.id - b.id);
}
function timing(s) { return [s.id, s.arrival, s.items, s.source, s.search, s.lane, s.searchTime, s.travel, s.join, s.start, s.end]; }

for (const [id, expected] of [['balance', 40.64356435643565], ['cheap', 40.257425742574256], ['costly', 89.89108910891089], ['express', 57.801980198019805]]) {
  const p = M.preset(id), s = drain(M.start(p));
  equal(M.stream(p), referenceStream(p), 'Independent default generator');
  ok(s.baseline.admitted === 101 && s.experiment.admitted === 101, 'Fixed stream has 101 shoppers');
  close(M.stats(s.baseline, p.cutoff).total, 40.64356435643565, 'Baseline fixture');
  close(M.stats(s.experiment, p.cutoff).total, expected, id + ' fixture');
  for (const run of [s.baseline, s.experiment]) {
    equal(run.completed.slice().sort((a, b) => a.id - b.id).map(timing), referenceRun(p, referenceStream(p), run.experiment).map(timing), 'Independent event ledger: ' + id);
    const mean = M.stats(run, p.cutoff);
    close(mean.total, mean.search + mean.travel + mean.wait + mean.service, 'Mean time decomposition');
  }
  ok(M.checkPrompt(id, s, M.PROMPTS[id].answer).correct, 'Prompt success');
  ok(!M.checkPrompt(id, s, 'incorrect').correct, 'Wrong answer rejected');
  ok(!M.checkPrompt(id, M.start(p), M.PROMPTS[id].answer).correct, 'Incomplete comparison rejected');
  ok(!M.checkPrompt(id, { ...s, params: params({ seed: 9 }) }, M.PROMPTS[id].answer).correct, 'Different settings rejected');
}

// Explicit clock examples include simultaneous arrivals and finishing/joining on the same tick.
let state = injected([shopper(1, 0, 1), shopper(2, 0, 1), shopper(3, 4, 1)], { share: 0 });
state = M.advanceMany(state, 4); // ticks 0–3
ok(state.tick === 3 && state.baseline.lanes[0].active.id === 1, 'Travel 3; service begins at tick 3');
equal(state.baseline.lanes[0].queue.map(s => s.id), [2], 'Simultaneous joins ordered by ID');
state = M.advanceMany(state, 4); // through tick 7
ok(state.baseline.completed[0].end === 7 && state.baseline.lanes[0].active.id === 2, 'Complete service before next checkout starts');
ok(state.baseline.lanes[1].active === null && state.baseline.pending[0].join === 8, 'Shopper 3 is still travelling at tick 7');
state = M.advance(state);
ok(state.baseline.lanes[1].active.id === 3 && state.baseline.lanes[1].active.start === 8, 'Shorter lane with four-unit travel starts at tick 8');
state = drain(state);
const second = state.baseline.completed.find(s => s.id === 2);
ok(second.start === 7 && second.end === 11 && second.start - second.join === 4, 'FIFO wait and completion');

state = injected([shopper(1, 0, 1)], { share: 100 }); state = drain(state);
const searched = state.experiment.completed[0];
ok(searched.searchTime === 4 && searched.travel === 3 && searched.join === 7 && searched.start === 7 && searched.end === 11, 'Exact search/travel/service decomposition');
state = injected([shopper(1, 0, 1), shopper(2, 4, 1)], { share: 0 }); state = drain(state);
ok(state.baseline.completed[1].start === 8, 'Later arrival observes occupied lane');

const choiceState = M.start(params({ depth: 2, share: 100 })), run = choiceState.experiment;
run.lanes[0].queue = [{ items: 30 }]; run.lanes[1].queue = [{ items: 1 }, { items: 1 }];
let decision = M.choose(choiceState.params, run, shopper(9, 0, 1), 0);
ok(decision.lane === 1 && decision.prediction === 12 && decision.searchTime === 2, 'Workload overrules smaller people count');
const baselineRun = { ...run, experiment: false };
ok(M.choose(choiceState.params, baselineRun, shopper(9, 0, 1), 0).lane === 0, 'Count-only choice takes fewer people');
run.lanes[0].queue = []; run.lanes[1].queue = [];
run.lanes[0].active = { id: 1, end: 2, items: 1 };
decision = M.choose(choiceState.params, run, shopper(9, 0, 1), 0);
ok(decision.lane === 0 && decision.prediction === 9, 'Observed service drains during search and travel');
run.lanes[0].active = null;
ok(M.choose(choiceState.params, run, shopper(9, 0, 1), 0).lane === 0, 'Equal predictions break by source distance');
ok(M.choose(choiceState.params, baselineRun, shopper(9, 0, 1, 1.5), 0).lane === 1, 'Equal distance ties break by lower lane');
const ep = params({ express: true, cutoff: 10, share: 100, depth: 4, cost: 8 });
ok(M.choose(ep, run, shopper(9, 0, 10, 3), 0).lane === 3, 'Cutoff basket eligible');
decision = M.choose(ep, run, shopper(9, 0, 11, 3), 0);
ok(decision.lane === 2 && decision.candidates.length === 3 && decision.searchTime === 24, 'Ineligible basket inspects only three eligible lanes');
ok(M.choose({ ...ep, cutoff: 30 }, run, shopper(9, 0, 30, 3), 0).lane === 3, 'Cutoff 30 allows all baskets');

// Intermediate-state conservation, precision, eligibility and drain properties across varied inputs.
let randState = 123456789;
function rand() { randState = (Math.imul(randState, 1103515245) + 12345) >>> 0; return randState / 4294967296; }
const scenarios = [params({ arrival: 0 }), params({ arrival: 30, horizon: 1200, share: 100, depth: 4, cost: 8, express: true, cutoff: 1 }),
  params({ seed: 2147483647, arrival: 30, share: 0, express: false }), params({ share: 100, cost: 0, cutoff: 30, express: true })];
for (let i = 0; i < 60; i++) scenarios.push(params({ seed: 1 + Math.floor(rand() * 2147483646), arrival: Math.floor(rand() * 31),
  horizon: 100 * (1 + Math.floor(rand() * 4)), share: Math.floor(rand() * 101), depth: 2 + Math.floor(rand() * 3),
  cost: Math.floor(rand() * 9), cutoff: 1 + Math.floor(rand() * 30), express: rand() < .5 }));
for (const p of scenarios) {
  let s = M.start(p); const original = JSON.stringify(s); M.advance(s); equal(JSON.stringify(s), original, 'Advance leaves input unchanged');
  equal(s.shoppers, referenceStream(p), 'Independent varied seed');
  const bound = p.horizon + 38 + 33 * s.shoppers.length;
  while (!M.finished(s) && s.tick < bound) {
    s = M.advance(s);
    for (const run of [s.baseline, s.experiment]) {
      const occupants = M.shopperRows(run, s.tick);
      ok(run.admitted === occupants.length && run.admitted === run.completed.length + M.unfinished(run), 'Shopper conservation every tick');
      ok(new Set(occupants.map(s => s.id)).size === occupants.length, 'No duplicate shopper');
      for (const lane of run.lanes) ok(Number.isFinite(M.workload(lane, s.tick)) && M.workload(lane, s.tick) >= 0, 'Finite nonnegative workload');
      for (const r of occupants) if (run.experiment && p.express && r.lane === 3) ok(r.items <= p.cutoff, 'Every phase respects express eligibility');
    }
  }
  ok(M.finished(s), 'Varied configuration drains');
  for (const run of [s.baseline, s.experiment]) {
    ok(run.completed.length === s.shoppers.length, 'No admitted shopper omitted from final mean');
    equal(run.completed.slice().sort((a, b) => a.id - b.id).map(timing), referenceRun(p, referenceStream(p), run.experiment).map(timing), 'Varied independent event ledger');
    for (const r of run.completed) {
      ok(r.start >= r.join && r.end === r.start + r.items + 3, 'Service timing and nonnegative wait');
      ok(r.end - r.arrival === r.searchTime + r.travel + r.start - r.join + r.items + 3, 'Individual time decomposition');
    }
    const all = M.stats(run, p.cutoff);
    if (all.count) {
      close(all.total, run.completed.reduce((sum, r) => sum + r.end - r.arrival, 0) / all.count, 'Independent final mean');
      close(all.total, all.search + all.travel + all.wait + all.service, 'Cohort components sum');
      ok(M.stats(run, p.cutoff, 'eligible').count + M.stats(run, p.cutoff, 'ineligible').count === all.count, 'Eligibility cohorts partition arrivals');
      ok(M.stats(run, p.cutoff, 'search').count + M.stats(run, p.cutoff, 'nonsearch').count === all.count, 'Search cohorts partition arrivals');
    } else ok(all.total === null && all.wait === null, 'No shoppers gives unavailable, not zero means');
  }
  if (!p.express && !p.share) equal(s.baseline.completed, s.experiment.completed, 'No-policy equivalence');
  ok(M.advance(s) === s, 'Finished state is stable');
}
const restarted = drain(M.start(M.initial()));
equal(restarted, drain(M.start(M.initial())), 'Deterministic restart');
ok(M.stats(restarted.baseline, 10, 'search').total === null, 'Baseline search cohort is empty');
for (const [key, [min, max, step]] of Object.entries(M.LIMITS)) {
  for (const v of ['', ' ', null, undefined, NaN, Infinity, true, [], min - step, max + step, min + .5]) ok(!!M.validate(v, key), 'Reject invalid ' + key);
  for (const v of [min, max, min + step, String(min)]) ok(!M.validate(v, key), 'Accept numeric boundary ' + key);
}
ok(!!M.validate(150, 'horizon'), 'Horizon step enforced');
ok(!!M.validateParameters(params({ express: 'true' })).express, 'Boolean express required');
ok(Object.keys(M.validateParameters(null)).length === Object.keys(M.LIMITS).length + 1, 'Missing settings rejected');
let threw = false; try { M.start(params({ seed: 0 })); } catch (e) { threw = e instanceof RangeError; } ok(threw, 'Initialization refuses invalid settings');
threw = false; try { M.preset('missing'); } catch (e) { threw = e instanceof RangeError; } ok(threw, 'Unknown preset rejected');
ok(!M.checkPrompt('missing', restarted, '').correct, 'Unknown prompt rejected');
// Chart/table equivalence at an unsampled tick and the initial/sample boundaries.
let live = M.start(M.initial());
equal(M.historySamples(live.baseline, live.tick), [], 'No invented pre-start sample');
live = M.advanceMany(live, 8); // tick 7, between stored samples
const savedHistory = JSON.stringify(live.baseline.history);
const samples = M.historySamples(live.baseline, live.tick);
equal(samples.map(s => s.tick), [0, 7], 'Live endpoint supplements recorded history');
equal(samples[1].lanes, M.laneRows(live.baseline, 7), 'Live endpoint has exact current values');
equal(JSON.stringify(live.baseline.history), savedHistory, 'Reading samples leaves the history immutable');
live = M.advanceMany(live, 3); // tick 10 already recorded
equal(M.historySamples(live.baseline, live.tick).map(s => s.tick), [0, 10], 'Recorded endpoint is not duplicated');
console.log(JSON.stringify({ checks, failures: 0, scenarios: scenarios.length, independent_event_ledger: 'pass', fixed_seed_fixtures: 'pass' }));
