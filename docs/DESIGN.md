# Design

## The problem

A team changes a prompt or swaps a model. Accuracy on their test set goes from 85.8% to 88.5%. Is that better? Often the honest answer is "we cannot tell", and sometimes a group of customers got worse while the average went up. The harness answers three questions on every change: how sure are we of each number, is the difference more than noise, and did any slice get worse.

## Architecture

```
 data/testset.jsonl ──┐                         ┌── metrics.js   accuracy, macro-F1, confusion, slices, calibration
 (ids, gold labels,   │   run.js                │
  slices)             ├─> candidate.run(text) ──┼── judge.js     rubric checks on the drafted reply
                      │   (v1, v2, v3 or an     │      └── agreement.js / ratings.js   kappa vs human ratings
 candidates/*.js ─────┤    HTTP adapter)        ├── stats.js     seeded bootstrap, McNemar exact, min detectable difference
 adapters/*.js ───────┘                         └── flakiness.js N noisy runs, unstable cases
                                                         │
                                  evaluate.js (scoreRun, summarize, compare)
                                                         │
                          gate.js  decide(base, candidate, comparison, thresholds)
                                    -> ship | blocked | undecided + one line per rule
                                                         │
          scripts/gate.mjs (exit code, CI)   scripts/evaluate.mjs (docs/results.json)   index.html + app.js (browser)
```

Everything in `src/` is pure: no file access, no network, no clock. Node reads the files and the browser fetches them, and both call the same functions, so the page is never a mock-up of the tests.

## Decisions and trade-offs

- **Candidates are stand-ins.** There is no live model, so v1 to v3 are deterministic rule sets with the same interface a model adapter has (`run(text) -> {intent, urgency, confidence, reply}`). The harness never sees gold labels, only the message text. `adapters/chat-completions.js` shows the real thing: a chat-completions HTTP call with key, endpoint and model from environment variables, and a strict parse of the reply.
- **Seeded everything.** Bootstrap resampling, case removal and sampling noise use one small seeded generator, so a number on the page can be reproduced from the command line and a CI failure can be replayed.
- **Paired, exact tests.** Both versions answer the same cases, so the right test looks only at the cases where they disagree (McNemar). It is exact (binomial), because the discordant counts are small. Normal approximations are wrong at these sizes.
- **A gate that can say "I cannot decide".** Below the minimum size the gate returns `undecided` and exits non-zero. A confident verdict from 40 cases would be worse than no verdict.
- **Slice rule in points, significance optional.** "No slice may drop more than 3 points" is easy to explain and is what teams ask for, but on a slice of 50 cases one case is 2 points, so it raises false alarms (the demo shows one). `requireSliceSignificance` makes the rule also ask for a significant exact test, at the price of missing real drops on small slices.
- **The judge is measured, not trusted.** The rubric judge is deterministic and explicit, and it is compared with human ratings by Cohen's kappa. Ratings store the exact reply text, so if a candidate's wording changes the rating is flagged stale and dropped rather than silently reused.
- **Calibration of urgency.** Each candidate reports a confidence; the expected calibration error is gated so an over-confident version cannot ship quietly.

## What I would do next for production

- Replace the point rule with a per-slice sequential test, and weight slices by traffic.
- Rate far more replies (78 is enough to show the method, not to certify a judge), with two raters per reply so human-human kappa gives a ceiling for the judge.
- Store every run (outputs, seed, config hash) so a gate decision is auditable; add cost and latency as gated metrics.
- For a real model: cache by (prompt, input), run each case several times and gate on the per-case majority, using the flakiness report to set how many runs are needed.
- Grow the test set from real, anonymised traffic with a refresh policy, and keep a never-tuned holdout.
