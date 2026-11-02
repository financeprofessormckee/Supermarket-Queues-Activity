# Supermarket

**[Click Here to Launch the Interactive Activity](https://financeprofessormckee.github.io/Supermarket-Queues-Activity/)**

> **Status:** revised development version (November 2026), under review with David Friedman.
> Not yet accessibility-audited for teaching release. Review notes for this revision are in
> [REVIEW.md](REVIEW.md).

Explore queue equilibria, negative feedback, search costs, and imperfect information. Two stores receive identical seeded shoppers. The baseline store balances on visible people counts; the experiment store can let shoppers pay to inspect basket workloads and can reserve an express lane. Students compare total exit time across policies. This revision adds a paired-outcome experiment lab: a policy-result card up front, with matched cohorts, a shopper inspector, and twelve-seed trials collapsed until opened.

## Educator Guide: Classroom Integration

This activity is a browser adaptation of Proposal 8 in David Friedman's
[Living Paper](http://daviddfriedman.com/Living_Paper/living_paper.htm) catalog of teaching programs
([original program descriptions](http://daviddfriedman.com/Living_Paper/Program_Descriptions/program_descriptions.htm)).

### The Economic Model

* **Queues:** four lanes, baskets of 1–30 items, service time = items + 3.
* **Paired comparison:** both stores see the same arrivals, so differences come from policy alone.
* **Self-checks:** four optional prompts on balancing, workload information, costly search, and express capacity.

The full model, its adaptations from Friedman's description, and acceptance cases are in
[SPECIFICATION.md](SPECIFICATION.md). The recorded source brief is in [DESIGN.md](DESIGN.md).

### Running it locally

Open `index.html` in a browser. There's no build step, installation, or server, and
everything is local. Model tests run with Node: `node tests/model-tests.cjs`.

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
