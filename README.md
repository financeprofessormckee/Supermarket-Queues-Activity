# Supermarket

**[Click Here to Launch the Interactive Activity](https://financeprofessormckee.github.io/Supermarket-Queues-Activity/)**

> **Status:** proposed experiment-lab alternative to the v1 review prototype. The
> original simulation rules are retained. This proposal has not completed the
> visual, screen-reader, and classroom audit required for teaching release.

Explore queue equilibria, negative feedback, search costs, and imperfect information. Two stores receive identical seeded shoppers. The baseline store balances on visible people counts; the experiment store can let shoppers pay to inspect basket workloads and can reserve an express lane. Students compare total exit time across policies.

## Educator Guide: Classroom Integration

This activity is a browser adaptation of Proposal 8 in David Friedman's
[Living Paper](http://daviddfriedman.com/Living_Paper/living_paper.htm) catalog of teaching programs
([original program descriptions](http://daviddfriedman.com/Living_Paper/Program_Descriptions/program_descriptions.htm)).

### The Economic Model

* **Queues:** four lanes, baskets of 1–30 items, service time = items + 3.
* **Paired comparison:** both stores see the same arrivals, so differences come from policy alone.
* **Self-checks:** four optional prompts on balancing, workload information, costly search, and express capacity.
* **Matched evidence:** final means, the 90th percentile, time components, and faster/tied/slower counts compare the same shoppers across stores. Inspect any admitted shopper's choice and outcome.
* **Sensitivity check:** twelve consecutive seeds test whether a result persists across arrival streams. Each pair uses identical shoppers; summaries weight nonempty seeds equally. This is not a confidence interval.
* **Evidence export:** download final paired shoppers or completed seed trials as CSV with the exact applied settings.

The full model, its adaptations from Friedman's description, and acceptance cases are in
[SPECIFICATION.md](SPECIFICATION.md). The recorded source brief is in [DESIGN.md](DESIGN.md).

### Running it locally

Open `index.html` in a browser. There's no build step, installation, or server, and
everything is local. Model tests run with Node: `node tests/model-tests.cjs`.
Additional evidence tests run with `node tests/analysis-tests.cjs`. No runtime
dependencies, build step, server, persistence, or external services were added.
For the optional DOM/controller suite, use Node 22.22.2+, 24.15.0+, or 26+
within the supported major versions, then `npm ci --prefix tests` and
`npm test --prefix tests`. These dependencies are for verification only.

See [REVIEW.md](REVIEW.md) for the original audit and [LAB-PROPOSAL.md](LAB-PROPOSAL.md)
for the proposed teaching flow, analysis definitions, and verification limits.

### License and Citation

The source code for this web application is licensed under the [MIT License](LICENSE). You
are free to use, modify, and distribute the software, consistent with the Living Paper's
request that code based on Friedman's proposals remain open source.

The economic concepts are David Friedman's. The West Texas A&M University name, seal, and
branding assets are not covered by the license and do not imply institutional endorsement
of derivative works. If you use or adapt this activity, please cite this repository.

---
*Economic concepts: [David Friedman](http://daviddfriedman.com/Living_Paper/living_paper.htm). Development: [Eric McKee](https://github.com/financeprofessormckee),
Paul and Virginia Engler College of Business, West Texas A&M University.*
