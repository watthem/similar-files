# Forage Top-Down 2-Day Plan

Repo: `oss/@watthem/similar-files`
Namespace: `similar-files`
Enabled Pipelines: `dev`
Window: `Day 1 + Day 2`
Status: `PLANNED`

## Mental Model

1. Use forage as the operating loop for this repo, not as parallel bookkeeping.
2. Keep active work visible through `.forage/items/*.md` and `active.json`.
3. Treat stage movement as an explicit decision with evidence.
4. Promote only stable, repeated value to OSS candidates.

## Day 1 Plan

1. Run preflight: validate `.forage` structure and action workflow references.
2. Select one active item per enabled pipeline for trial execution.
3. Run `/forage focus` and capture first actionable next step.
4. Execute one stage transition for at least one item.
5. Log Day 1 checkpoint in this repo with:
   - what worked
   - what blocked flow
   - required manual patches

## Day 2 Plan

1. Run a second operator handoff from existing `.forage` state.
2. Exercise status/validate action path in CI context where available.
3. Force one ambiguous ID or stage case and record resolution quality.
4. Propose repo-specific OSS candidates from proven workflows.
5. Log Day 2 checkpoint and final recommendation:
   - keep internal
   - open-source now
   - open-source after hardening

## Metrics

1. Time to first clear next step (minutes).
2. Number of stage transitions completed cleanly.
3. Number of schema or migration issues encountered.
4. Number of docs gaps discovered.

## Exit Criteria

1. At least one successful `/forage focus` session completed.
2. At least one item moved forward with no data corruption.
3. Repo-specific OSS recommendation recorded with rationale.

## Notes

Track findings in repo-local docs and update `.forage` item history so decisions are auditable.
