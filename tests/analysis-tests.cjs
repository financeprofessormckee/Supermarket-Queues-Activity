'use strict';
const assert = require('node:assert/strict');
const M = require('../js/model.js');
const A = require('../js/analysis.js');
let checks = 0;
function equal(actual, expected) { assert.deepEqual(actual, expected); checks++; }
function close(actual, expected) { assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`); checks++; }
function drain(params) {
  let state = M.start(params);
  const limit = params.horizon + 38 + 33 * state.shoppers.length;
  while (!M.finished(state) && state.tick < limit) state = M.advanceMany(state, 200);
  assert.ok(M.finished(state)); return state;
}

// Hand-calculated ledger deliberately uses different completion orders in the stores.
function shopper(id, arrival, items, searchTime, travel, start, search) {
  return { id, arrival, items, source: 0, lane: 0, search, searchTime, travel,
    join: arrival + searchTime + travel, start, end: start + items + 3 };
}
const manual = M.start(M.initial()); manual.tick = 599;
manual.baseline.completed = [shopper(4, 3, 2, 0, 3, 16, false), shopper(3, 2, 30, 0, 3, 9, false),
  shopper(1, 0, 1, 0, 3, 3, false), shopper(2, 1, 10, 0, 3, 6, false)];
manual.experiment.completed = [shopper(2, 1, 10, 0, 4, 10, false), shopper(1, 0, 1, 2, 3, 5, true),
  shopper(4, 3, 2, 0, 3, 6, false), shopper(3, 2, 30, 4, 3, 9, true)];
manual.baseline.admitted = manual.experiment.admitted = 4;
const original = JSON.stringify(manual), result = A.result(manual);
equal(A.pairs(manual).map(r => [r.id, r.delta]), [[1, 2], [2, 4], [3, 0], [4, -10]]);
equal(result.baseline, { count: 4, mean: 20.75, median: 18, p90: 40, max: 40 });
equal(result.experiment, { count: 4, mean: 19.75, median: 15.5, p90: 40, max: 40 });
equal([result.faster, result.same, result.slower], [1, 1, 2]);
equal(result.delta, { search: 1.5, travel: .25, wait: -2.75, service: 0, total: -1 });
equal(A.result(manual, 'search').baseline.mean, 23.5);
equal(A.result(manual, 'search').experiment.mean, 24.5);
equal(A.result(manual, 'nonsearch').delta.total, -3);
equal(A.result(manual, 'eligible').count, 3);
equal(A.result(manual, 'ineligible').count, 1);
equal(JSON.stringify(manual), original);
equal(A.result(M.start(M.initial())), null);
assert.throws(() => A.trial(M.start(M.initial())), /Drain/); checks++;
assert.throws(() => A.comparisonCSV(M.start(M.initial())), /Finish/); checks++;
equal(A.distribution([]), { count: 0, mean: null, median: null, p90: null, max: null });
equal(A.distribution([10, 2, 8, 4, 6]).median, 6);
equal(A.distribution(Array.from({ length: 10 }, (_, i) => i + 1)).p90, 9);
equal(A.seedFor(2147483647, 0), 2147483647);
equal(A.seedFor(2147483647, 1), 1);
equal(A.seedFor(1, 11), 12);
assert.throws(() => A.seedFor(0, 1), RangeError); checks++;
assert.throws(() => A.seedFor(1, -1), RangeError); checks++;
const mixed = [{ seed: 1, count: 1, delta: -2 }, { seed: 2, count: 999, delta: 4 }, { seed: 3, count: 0, delta: null }];
equal(A.trialsSummary(mixed), { count: 2, empty: 1, mean: 1, min: -2, max: 4, faster: 1, same: 0, slower: 1 });
equal(A.trialsSummary([]).mean, null);
const empty = drain({ ...M.initial(), arrival: 0 });
equal(A.result(empty).count, 0);
equal(A.result(empty).delta.total, null);
equal(A.trial(empty).delta, null);

// Check exact CSV values by parsing its quoted numeric/boolean fields.
function parseCSV(text) { return text.trim().split('\r\n').map(line => line.split(',').map(cell => cell.slice(1, -1).replace(/""/g, '"'))); }
let csv = parseCSV(A.comparisonCSV(manual));
equal(csv.length, 5);
const columns = csv[0], first = csv[1];
equal(first[columns.indexOf('shopper_id')], '1');
equal(first[columns.indexOf('baseline_total')], '7');
equal(first[columns.indexOf('experiment_total')], '9');
equal(first[columns.indexOf('experiment_minus_baseline')], '2');
equal(first[columns.indexOf('seed')], String(manual.params.seed));
equal(parseCSV(A.comparisonCSV(empty)).length, 1);
csv = parseCSV(A.trialsCSV(manual.params, [A.trial(manual), A.trial(empty)]));
equal(csv.length, 3); equal(csv[2].slice(-3), ['', '', '']);

// Verify matched means against a separate ID lookup and scalar arithmetic.
const trialRows = [];
for (let i = 0; i < 12; i++) {
  const state = drain({ ...M.initial(), seed: A.seedFor(M.initial().seed, i) });
  const rows = A.pairs(state), summary = A.result(state);
  let sum = 0;
  for (const e of state.experiment.completed) {
    const b = state.baseline.completed.find(s => s.id === e.id);
    sum += (e.end - e.arrival) - (b.end - b.arrival);
  }
  close(summary.delta.total, sum / state.shoppers.length);
  close(summary.delta.total, summary.delta.search + summary.delta.travel + summary.delta.wait + summary.delta.service);
  equal(summary.delta.service, 0);
  equal(summary.faster + summary.same + summary.slower, rows.length);
  equal(A.result(state, 'search').count + A.result(state, 'nonsearch').count, rows.length);
  equal(A.result(state, 'eligible').count + A.result(state, 'ineligible').count, rows.length);
  trialRows.push(A.trial(state));
}
close(A.trialsSummary(trialRows).mean, trialRows.reduce((sum, r) => sum + r.delta, 0) / 12);
const balance = drain(M.preset('balance'));
equal(A.result(balance).delta.total, 0);
equal(A.result(balance).same, balance.shoppers.length);
equal(A.result(balance).faster, 0);
equal(A.result(balance).slower, 0);
console.log(JSON.stringify({ checks, failures: 0, paired_ledger: 'pass', seed_trials: trialRows.length, csv: 'pass' }));
