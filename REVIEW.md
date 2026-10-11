# Review of the v1 supermarket activity

Reviewed upstream commit `884c15a160137aee258d3e993a468f13ce3e27f6` and its public activity. These are proposed changes for review; they do not constitute the teaching-release accessibility audit described in the specification.

## What already works

The model separates shopper decisions, rendering, and playback. It preserves paired arrivals, includes search and travel in total exit time, drains all admitted shoppers, and distinguishes provisional from final means. The independent event-ledger tests reproduce all four documented scenarios. The original 400,646 assertions pass across 64 configurations. No routing, service-timing, FIFO, or final-average defect was found in that coverage.

The local scripts, visible model assumptions, labelled controls, table equivalents, and institutional masthead are useful foundations. The conservative proposal retains the simulation rules, preset values, credits, assets, and offline operation.

## Findings and conservative changes

| Finding | Why it matters | Change |
| --- | --- | --- |
| The chart appends the current tick; the history table reads only stored ten-tick samples. | At tick 7, for example, the chart has ticks 0 and 7 but the purported equivalent table has only tick 0. | One immutable `historySamples` helper supplies both views. Regression checks cover the initial state, tick 7, and recorded tick 10. |
| Finish disables the focused button; completion disables Pause or Step. | Keyboard users can lose their place in the document. | Finish hands focus to Pause; completion moves it to the run status only if the user still has focus on the playback control. Other reading positions are left alone. |
| A custom applied setting can leave a guided question tied to incompatible settings. | The question cannot succeed until the original preset is reloaded. | Clear a question when successfully applied settings depart from its exact preset; retain it when settings still match. Invalid edits retain the prior comparison. |
| The active preset and guided question have no selected state. | It is difficult to tell which comparison is in use. | Add visible and assistive-technology pressed states; staged edits remove preset selection. |
| Searcher and non-searcher means describe different people. | Their difference can be mistaken for the causal benefit of searching. | Explain that limitation beside the table and identify the final paired all-shopper comparison. |
| Zero-arrival runs display final completion without an explicit no-data conclusion. | A missing mean can be mistaken for a zero-time outcome. | State that no average or policy comparison is available. |
| Forecast wording only mentions future arrivals. | Already admitted shoppers who are still inspecting or travelling are also absent from observed lane workloads. | State both exclusions; describe inspection/travel as costs rather than already-paid time. |
| No JavaScript fallback and results distant from playback. | Script failures look like empty output; long scrolling interrupts comparisons. | Add a `noscript` explanation and an ordinary results link. |

## Model and teaching limits

- The original specification deliberately holds demand fixed. It does not implement price-sensitive arrivals, endogenous search, lane switching, or profit maximization. Those would be new models, not bug fixes.
- Workload snapshots omit incoming shoppers. Forecast errors are therefore expected. Changing that information set would change shopper behavior and the teaching exercise.
- The default cheap-information advantage is only about 0.39 time units per shopper for one seeded stream. It is an example, not evidence of a universal policy ranking.
- Restricting express eligibility can leave capacity idle while other lanes are congested. That is part of the tradeoff the activity is intended to expose.
- The long page makes it harder to connect choices to outcomes. A separate, more ambitious proposal adds a compact results dashboard, matched-shopper evidence, and repeated-seed experiments without changing these economic rules.

## Verification

Run `node tests/model-tests.cjs`. The original independent ledger and fixtures remain unchanged; five history-sample checks have been added. Browser verification and its limits are recorded in the pull-request description. No claim of WCAG conformance, screen-reader certification, or classroom validation is made.

Local DOM/controller checks (jsdom 30.1.2) passed 58 assertions for initialization, active scenarios, chart/table endpoint agreement, Finish/Pause focus, invalid-input retention, all four prompts, incompatible-question clearing, no arrivals, playback cancellation, and page hiding. The original public activity was exercised in a real browser. Changed local pages could not be opened in the available cloud browser because file URLs are blocked; actual layout, native keyboard behavior, download delivery, and screen-reader behavior were not verified for these changes.
