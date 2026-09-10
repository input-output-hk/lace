# Reassure perf tests (`@lace-lib/ui-toolkit`)

Per-PR, baseline-comparable **render/JS performance regression tests** for the
**shared** design-system components — the ones rendered by lace-next,
lace-mobile AND lace-extension alike. Guarding them here, in the owning
package, catches a per-render regression once for every consumer instead of
per app.

This is the sibling of `packages/next/ui/perf/`: that island measures
next-specific screens and `@lace-next/core`-coupled paths; this one measures
`@lace-lib/ui-toolkit` components in isolation. Which components are covered
and why:
[docs/plans/reassure-ui-toolkit-component-map.en.md](../../../../docs/plans/reassure-ui-toolkit-component-map.en.md).

## Where a test belongs

- Imports only from `@lace-lib/ui-toolkit` (+ deterministic local fixtures)
  → **here**.
- Imports selectors / formatters / store from `@lace-next/core`, or a
  next/mobile screen → the consuming package's perf island (e.g.
  `packages/next/ui/perf/`).

## The Jest island

Unit tests in this package run on **Vitest** (`vitest.config.js`, `test/`).
These perf tests are a separate Jest suite (Reassure requires Jest):

- Config: [`jest.perf.config.js`](../jest.perf.config.js) — `jest-expo`
  preset with an explicit `babel-preset-expo` transform (the workspace root
  babel config defines no presets), a chained resolver for
  react-native-worklets, and mocks for native/ESM-only modules the measured
  components never exercise (`mocks/`).
- Tests: `perf/*.perf-test.{ts,tsx}` — the `.perf-test` suffix keeps the two
  worlds from ever overlapping.
- Output: `.reassure/` (gitignored).

## Running

```bash
# One measurement run (compares against .reassure/baseline.perf if present):
npx nx run @lace-lib/ui-toolkit:test-perf

# Full two-pass comparison by hand (from packages/lib/ui-toolkit):
TEST_RUNNER_PATH=../../../node_modules/.bin/jest \
TEST_RUNNER_ARGS='--config jest.perf.config.js --runInBand --forceExit' \
  ../../../node_modules/.bin/reassure --baseline   # on the base commit
# ...switch to your branch...
  ../../../node_modules/.bin/reassure              # measure + compare → .reassure/output.{md,json}
```

`--forceExit` mirrors the next/ui island for consistency across the two
suites.

## CI

The `render-perf` job in [ci.yml](../../../../.github/workflows/ci.yml) runs
the two-pass comparison automatically on every PR where nx marks this package
as affected: `scripts/reassure-ci.sh` measures at the merge-base (baseline)
and at the head (current) on the same runner, `scripts/reassure-check.js`
gates on the result, and the report is posted as a sticky PR comment. The
gate enforces only when the repo variable `REASSURE_GATE` is `fail`
(report-only otherwise). Design and rollout stages:
[docs/plans/reassure-ci-two-pass.md](../../../../docs/plans/reassure-ci-two-pass.md).

## Gate policy (pilot — plan §D3)

- **Render/function COUNT changes: hard gate.** Deterministic and
  machine-independent.
- **Duration changes: warn-only, never block.** Sub-millisecond entries
  produce large percentage swings out of pure noise; machine load does the
  same to bigger ones.

## What is measured (and why)

| Test                                                | Guards                                                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `tokenItem` — 50 `TokenItem`, initial render        | the portfolio token list's per-row mount cost                                                    |
| `tokenItem` — parent re-render with identical props | memoization: TokenItem is not React.memo today, so this duration IS the 50-row wasted-work bill  |
| `tokenItem` — single row balance update             | row isolation: one balance tick currently re-renders the whole list (the per-sync scenario)      |
| `tokenItem` — theme switch light↔dark               | the re-theming bill for all consumers (provider measured too — see the in-file note)             |
| `activityList` — 100 rows into `ActivityList`       | the activity tab's shared list-template render                                                   |
| `accountCard` — standard variant, initial render    | the home carousel's per-account hero card, including the d3-backed LineChart sparkline           |
| `accountCard` — per-sync balance + sparkline update | the real per-sync bill: new balance string + new sparkline array → full card + d3 path recompute |
| `nftItem` — 24 `NFTItem`, initial render            | the portfolio NFTs tab's per-cell mount cost (one visible grid page)                             |
| `contactItem` — 30 `Contact`, initial render        | the Send address book's per-row mount cost                                                       |
| `contactItem` — expand/collapse a multi-address row | accordion isolation: only the pressed row should commit against a 30-row backdrop                |
| `searchBar` — type 5 characters then clear          | the shared controlled input's per-keystroke commit structure (all search surfaces)               |
| `recoveryPhrase` — 24 words blurred, initial render | onboarding / settings phrase display: 24 IndexedChip + BlurTextView cells                        |
| `recoveryPhrase` — reveal + hide                    | the reveal toggle: all 24 cells re-render and mount/unmount their BlurView overlays              |
| `genericFlashList` — 100 trivial rows               | the shared list organism every list template renders through (wrapper overhead isolated)         |
| `genericFlashList` — per-sync data replacement      | the bill every visible list pays when a sync rebuilds the data array with equal contents         |
| `portfolioCard` — 4 variant mounts                  | the home screen's aggregate hero card; each variant assembles a different subtree                |
| `portfolioCard` — per-sync price + sparkline update | the home config's per-sync bill (new price string + new sparkline → memo cascade + d3 path)      |
| `dappCard` — 24 cells + identical-props re-render   | the dapp explorer grid's per-cell mount and its per-keystroke (filter) wasted-work bill          |
| `governanceCard` — 8 cards + identical-props        | the governance center's per-account card in both steady states                                   |
| `stakeCards` — StakeCard ×8 + status tick           | the stake center's per-account card and the summary header's per-sync update                     |
| `notificationCard` — 20 rows                        | the notifications page's per-row mount cost                                                      |
| `priceHistoryUtils` — measureFunction ×2            | downsampling (8760→100) and the per-drag-frame scrubber path (`getPriceDataForDragPosition`)     |
| `poolCard` — 50 rows ×2 variants + identical-props  | the browse-pools list (the app's longest) incl. the real compactNumberWithUnit per row           |
| `dRepCard` — 30 rows + identical-props              | the browse-DReps list incl. the real BigNumber formatAmountToLocale per registered row           |
| `networkInfoCard` — full values                     | the network stats header (browse-pools / stake-center) incl. the real formatEpochEnd countdown   |
| `numericInput` — type "12.345"                      | the Send amount input's per-keystroke bill: regex + real convertAmountToNormalized + BigInt      |
| `swapInput` — type "12.345"                         | the swap amount field's per-keystroke commit structure (controlled input + fiat line)            |
| `formatActivity` — measureFunction ×2               | the activity tab's per-refresh format+group over 100 rows (pre-sorted and sorting paths)         |
| `sendSheetSections` — recipient/assets/fee/summary  | the send form's pieces: address per-keystroke, asset rows + amount tick, fee + summary mounts    |
| `liquiditySource` — toggle + 4 quotes + refresh     | the swap quotes screen; quotes refresh in a loop while visible, so the update cost repeats       |
| `epochsRewards` — 10 epochs + scale + filter        | the regular-pool sheet's rewards chart section (real formatAmountToLocale on the scale labels)   |

How to read the update scenarios: Reassure's render COUNT counts **commits**
of the measured tree (a parent update re-rendering all 50 rows is 1 commit),
so memoization changes surface in **duration** — structurally (~an order of
magnitude), not as noise — while count gates the commit structure (an
accidental extra state update per interaction shows up deterministically).

Fixtures (`fixtures/`) are fully deterministic: no `Date.now()`, no
`Math.random()`, and built directly in each component's prop shape so the
measurement is the component, not any app's formatting.

Components internal to a template (not on the package barrel) are reached via
[`deepImports.ts`](deepImports.ts) — see its note on the design-tokens ↔
design-system import cycle before adding more.

## Known limitations

- React runs in dev/profiling mode: numbers are **relative** (baseline vs
  head), never absolute budgets.
- `mocks/` come in two flavors. Fidelity mocks re-export REAL pure modules
  with a no-op-proxy fallback: `utilRender.js` (format-number + format-date —
  what PoolCard/DRepCard/NetworkInfoCard/NumericInput/formatActivity call at
  render time) and `laceContractActivities.js` (the ActivityType const
  module). Pure stubs (true-sheet, webview) stay inert and are safe only
  while no measured component renders those pieces — see the notes inside
  `jest.perf.config.js`. d3 is transpiled, not stubbed, because
  `AccountCard`'s LineChart needs it at render time.
