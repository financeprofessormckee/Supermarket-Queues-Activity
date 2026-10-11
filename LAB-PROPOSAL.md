# Proposed supermarket experiment lab

This is the ambitious alternative to the conservative fixes proposal. Both target the original v1 `main`; this alternative includes the conservative fixes. Choose one proposal rather than merging both unchanged.

## Teaching sequence

1. **Predict.** The four existing scenarios ask about balancing, the cost of information, and allocation of express capacity. A visible selected scenario explains what to look for.
2. **Observe.** Run, step, or finish the paired stores. A progress indicator distinguishes the arrival window from draining the queues. Workload bars share a scale across the eight lanes at the current tick. The numerical lane values remain available.
3. **Explain.** Final results show the baseline mean, experiment mean, signed policy difference, percentage difference, and 90th percentile. Stacked bars decompose search, travel, queue wait, and service on a shared scale, with labelled component differences and the original numerical table.
4. **Inspect distributional effects.** Count which matched shoppers finish faster, tie, or finish slower. Report paired cohorts using the experiment's assignment in both stores; this prevents comparing searchers to unrelated non-searchers. A selected shopper's candidate information, tie-resolved choice, phase, timing ledger, and final forecast error are inspectable side by side.
5. **Test again.** Complete twelve paired comparisons under the same applied settings and a reproducible sequence of seeds. Inspect each seed and export the underlying records.

The scope remains an economics activity about local information and negative feedback. This is not a store-management game. Price-sensitive demand, rational endogenous search, lane switching, and staffing decisions remain deferred.

## Analysis definitions

- No headline policy effect or paired distribution is shown until both stores drain. Provisional means remain labelled in the original component table.
- Pair records by shopper ID, not completion order. Group membership is defined by experiment search assignment or the applied basket cutoff and used in both stores.
- A shopper's policy change is experiment total exit minus their baseline total exit. The mean of these changes equals the difference of full-cohort means. Faster/tied/slower use the exact integer difference, not rounded values.
- These paired outcomes describe a change in the whole policy environment: other shoppers also change queues. They do not identify the isolated causal effect of one individual deciding to search.
- The percentage change divides the difference of store means by the positive baseline mean. With no admitted shoppers, every average is unavailable rather than zero.
- The 90th percentile uses nearest rank: sort total exit times and select index `ceil(0.9 * n) - 1`. It is reported separately per store, not as a percentile of individual paired changes.
- Seed `i` is `1 + (appliedSeed - 1 + i) mod 2147483647`, for `i = 0..11`. Arrivals and baskets are identical within each pair; streams differ between seeds.
- Seed summaries average the seed-level differences, with equal weight for each nonempty seed. They show the observed range and counts of faster/tied/slower seeds. There is no independence assumption, confidence interval, or probability claim.
- Stop or page hiding cancels the current seed's unfinished work. Partial summaries include only fully drained trials. Run again starts the twelve-seed sequence from the beginning. Settings edits, presets, restart, and defaults clear the trial results; this intentionally prevents stale results from being mistaken for a new policy.
- Seed trials do not advance or replace the main comparison. A bounded 200-tick batch yields to the event loop so Stop remains usable.

## Files and exports

`js/model.js` retains the original routing and timing engine, plus the conservative shared history-sample helper. `js/analysis.js` is a DOM-free, CommonJS/browser module for matched evidence, distributions, seed summaries, and CSV serialization. `js/lab-view.js` renders that evidence. The existing controller coordinates playback, inspection, downloads, and cancellable trial batches.

Both CSVs include applied seed, arrival rate, duration, search share/depth/cost, express status, and basket cutoff. Paired CSVs add shopper identity, both lane choices, each time component, and the signed difference. Seed CSVs include only complete trials; empty seed means are blank. Downloads are generated locally with a Blob URL and do not upload data.

## Verification and remaining review

- The original independent generator/event-ledger suite still passes: 400,651 assertions across 64 configurations, including the five conservative history-sample regressions. All four original preset fixtures remain exact.
- `node tests/analysis-tests.cjs`: 113 checks using a hand-calculated paired ledger with different completion orders, percentile boundaries, empty data, seed wrapping, full time decomposition, cohort conservation, twelve actual seeded runs, and CSV values.
- Local jsdom controller checks cover initialization, history-table endpoints, invalid-input retention, focus handoffs, all four guided prompts, pausing, page hiding, no arrivals, the shopper inspector, twelve-seed completion, cancellation, edit invalidation, CSV actions, and the largest configured scenario.
- The original public activity was exercised in a real browser. Local changed files could not be opened in the available cloud browser because file URLs are disallowed. jsdom verifies logic and DOM behavior; it does **not** verify layout, rendering, actual download delivery, or screen-reader behavior. Desktop/mobile visual review, native keyboard testing, and the original release accessibility audit remain required before teaching release.

The WT masthead assets, original author credits, and MIT license are unchanged. Their retention does not imply institutional endorsement of this proposal.
