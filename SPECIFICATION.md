# Supermarket — browser specification (v1)

> **Proposal note:** The v1 model below remains the reference. This branch adds the
> analysis and interface extension described in [LAB-PROPOSAL.md](LAB-PROPOSAL.md),
> including local CSV exports and repeated-seed trials. These are proposed additions,
> not claims about the original frozen scope or David Friedman's review approval.

- **Decided:** 2026-10-02, by Eric McKee; David Friedman's review is invited.
- **Reference:** Proposal 8 and the recorded DESIGN.md. The live description was unavailable during planning. Fresh browser code; no legacy import.

## Objective and scope

Explore queue balancing, imperfect information, search costs, and express-lane tradeoffs through paired baseline/experiment stores. Four FIFO lanes, two sources at opposite ends, fixed strategies, no abandonment or lane switching. Fixed arrivals are a selected adaptation: the source's generalized-cost demand response is deferred, along with profit management, adaptive search, relocation, and variable staffing. Timing, randomness, presets, and prompts below are Eric's decisions rather than verified legacy behavior.

## Model

Both stores receive the same shoppers. For each integer tick t = 0 through horizon − 1, take four draws from x = (1664525x + 1013904223) mod 2^32, divided by 2^32: admit if draw 1 < arrival/100; basket = 1 + floor(30 × draw 2); source = lane 1 if draw 3 < 0.5, else lane 4; experiment searcher if draw 4 < share/100. Consume all four draws even without admission. Service lasts basket + 3 ticks. Sources and lanes use coordinates 0–3; travel lasts 3 + absolute source-to-lane distance.

Baseline shoppers compare the nearest two lanes by people count (waiting plus in service). Experiment non-searchers do the same among eligible lanes. Ties prefer proximity, then lane number. With express enabled, lane 4 admits only baskets ≤ cutoff; every basket remains eligible for lanes 1–3.

Searchers inspect the nearest min(depth, eligible lanes) lanes from their source at arrival. Each inspected lane costs `cost` ticks; total search h = inspected count × cost. Observe workload W = current remaining service + sum(basket + 3) for the waiting queue. For candidate travel d, predicted exit duration = h + d + max(0, W − h − d) + own service. Choose the smallest prediction, then proximity, then lane number. This forecast allows current workload to drain but omits future arrivals; actual results may differ. Join at arrival + h + d. No physical lane-to-lane inspection tour or later reconsideration.

Tick order: complete services due; evaluate all new arrivals using pre-join queues; join scheduled shoppers by ID; start idle checkouts. Service starting at t finishes at t + basket + 3. Initialize before tick 0; Step processes one tick. After arrivals close, drain both stores. Never drop slow shoppers or pad a finished store with invented outcomes. A conservative termination bound is horizon + 38 + 33 × admitted shoppers.

Measure search, travel, queue wait = service start − join, service, and total exit = departure − arrival, with the components summing exactly. Cohort means use completed shoppers only until drainage, clearly labelled provisional with unfinished counts. Final averages cover every arrival. Classify eligible/ineligible baskets using the applied cutoff in both stores, including when express is disabled. Baseline shoppers all use the non-searching rule.

## Controls and prompts

Defaults: seed 20261002; arrival 18%; horizon 600; experiment share 50%; depth 4; cost 1; express off; cutoff 10. Whole-number ranges: seed 1–2147483647, arrival 0–30, share 0–100, depth 2–4, cost 0–8, cutoff 1–30. Horizon 100–1200 in steps of 100. Reject blank, nonfinite, off-step, and out-of-range entries. Numeric edits stage drafts and pause; disable advancement until Apply and restart or Restart discards drafts. Invalid Apply retains history and applied parameters, associates errors with fields, and focuses the first error.

Presets replace all settings: Queue balancing = defaults with share 0; Cheap information = defaults; Costly information = defaults with share 100/cost 8; Express checkout = defaults with express on. Restore defaults also clears the active prompt. Restart keeps applied settings, clears success, and discards drafts. Step advances one tick; Run advances ten per 700ms; Finish comparison uses cancellable bounded batches. Pause on editing or page hiding; stop automatically after drainage. No persistence, scoring, analytics, URL parameters, or services.

Four optional self-checks load their exact presets and require a drained comparison plus the correct conceptual answer: (1) shorter nearby lines attract shoppers, (2) basket workload reveals information shopper counts miss, (3) search cost can outweigh queue savings, (4) express access need not lower the store-wide average. Prompt checks also verify observed scenario behavior; parameter or answer changes clear success. The fixed-seed examples do not assert universal policy rankings.

## Interface and verification

Local classic scripts: js/model.js exposes SupermarketModel in browsers/CommonJS; js/view.js renders stores, histories and tables; js/app.js handles controls and playback. The DOM-free model exposes defaults, validation, presets, seeded streams, lane choices, initialization/advancement, statistics, histories, and prompt checks.

Paired diagrams label lanes, basket sizes, service, searching/travelling counts, and queued shoppers (bounded visual display with explicit omitted count). Queue workload histories use labels/patterns as well as colors and have equivalent numeric tables. Summary/cohort and individual-shopper tables distinguish all time components and incomplete phases. A textual most-recent decision exposes candidate counts, workloads, predictions, and information limits.

Native controls provide the entire keyboard/single-pointer workflow; preserve focus, associated errors, skip navigation, unobscured focus, ≥44px controls, pause/reduced-motion support, 320px reflow, and labelled focusable table scrollers. Announce deliberate actions without announcing every playback tick. WT assets and contributor credits remain local and unchanged. Functional verification is not WCAG certification.

Verify hand-calculated timing/routing/FIFO/ties, express boundary, forecasts, conservation, deterministic paired streams/restarts, no-policy equivalence, zero arrivals, parameter extremes, drainage, all prompts, browser controls/keyboard, file/HTTP agreement, tables/diagrams, and all seven pages at 1280/640/375/320px. Preliminary fixed-seed fixtures: 101 shoppers; total exit means baseline 40.6435643564, cheap search 40.2574257426, costly search 89.8910891089, express 57.8019801980. Independently reproduce these rather than assuming preliminary code is the implementation. Evidence/limits belong in VERIFICATION.md (in the authoring collection).

## Freeze

Verify, commit/push privately, and freeze v1 for David's review; existing frozen activities remain unchanged. No public publishing, outreach, license selection, or monitoring. After feedback and before teaching release: full WCAG 2.2/2.1 AA audit including Parsing, ACCESSIBILITY.md and Accessibility Conformance Report.docx, screen-reader/classroom evaluation, and release terms.
