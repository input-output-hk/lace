# Default Stake Pool Ordering

Date: 2026-08-21

## Status

Accepted

## Context

The browse-pools list is where a delegator chooses who earns their rewards. Its
order is a recommendation whether or not it is labelled as one: users read the
top of a list as "the best", so the sort key is a decision about what the wallet
advises, not a presentation detail.

The list had no deliberate order — pools rendered in whatever sequence the bulk
summaries arrived in, which is neither meaningful nor stable. Something had to be
chosen, and the choice is bounded by what the wallet can compute for ~3,000 pools
on a screen the user expects to open instantly.

Two sources inform the decision, and they answer different questions.

**IOHK's ranking specification** (`Stake Pool Ranking in Cardano`, Byaly &
Corduan, 2023) defines the **non-myopic member reward** (§3): what a pool would
pay a member at the stake it _would_ hold rather than the stake it holds now. Two
ideas make it non-myopic — a pool with little live stake divides the same block
rewards among few delegators and so shows a per-member rate that disappears as
soon as stake arrives; and the operator's own commitment is priced in, pledge
through the influence factor `a0`, cost and margin as the cut taken before
members are paid. It is the right answer to "how good is this pool", and it is
deliberately blind to how full the pool is today.

**Lace's own pool-recommendation design** frames the surrounding decision: hard
filters that disqualify a pool outright, then four weighted components — yield
40%, reliability 25%, decentralization 20%, saturation headroom 15% — normalised
and summed, with a deterministic shuffle of the top tier to stop the wallet's own
recommendation saturating whichever pool it puts first.

### Why not implement the ranking specification as written

The specification is the authoritative treatment of pool ranking, so departing
from it needs a reason. There are five, and none of them is a disagreement with
its mathematics.

**It answers a different question.** The non-myopic member reward ranks pool
_quality at its target size_. A wallet is answering something narrower and more
practical: where should _this_ delegator put _their_ stake, _now_. A pool can be
excellent by the first measure and a poor destination by the second.

**It is saturation-blind below 100%.** Every pool inside the desired `k` is
priced at `max(σ, z0)`, so a pool at 2% of saturation and one at 98% score
identically, and only pools already past 100% are penalised. Recommending the
98% pool is advice the delegator's own stake then invalidates — theirs is the
stake that pushes it over, after which every member's share dilutes.

**A faithful implementation is not on the table anyway.** The specification's
reliability term — the hit rate of §2 — needs per-epoch blocks and stake for
every pool, which costs one request per pool. Holding apparent performance at 1
is itself a deviation, forced by data rather than chosen. "Faithful" would mean
shipping the specification minus its reliability term and presenting the result
as complete.

**It has no notion of operator concentration.** Forty pools under one operator
each rank on their own merits, which satisfies the metric while working against
the decentralisation the delegator's rewards ultimately depend on. The
specification is not wrong to omit this; it is ranking pools, not allocating a
network.

**It is a ranking metric, not a recommendation policy.** It deliberately says
nothing about pools that are retiring, publish no metadata, or hold stake and
mint nothing — all of which a wallet has to exclude whatever they score.

So the specification is used where it is authoritative, to price the reward, and
is not stretched into a role it never claimed. Decisions 3 to 5 cover what it
leaves open.

### What the client can actually compute

This is the constraint that shapes everything below, so it is stated plainly
rather than discovered in the code.

The list is built from one bulk endpoint, `pools/extended`, which carries per
pool: `pool_id`, `active_stake`, `live_stake`, `live_saturation`,
`declared_pledge`, `margin_cost`, `fixed_cost`, a **lifetime** `blocks_minted`,
and metadata (name, ticker, description). Network data adds `k`, `a0`, `rho`,
`tau`, reserves, max supply, total live stake and the retiring-pool set.

Everything else the ideal algorithm wants costs one request **per pool** —
thousands per list open — which the screen's latency budget cannot absorb:

| Component                            | Needs                                                          | Have it?                      |
| ------------------------------------ | -------------------------------------------------------------- | ----------------------------- |
| Yield                                | reward parameters, stake, pledge, cost, margin                 | **yes**                       |
| Yield, luck-adjusted over ~20 epochs | per-epoch blocks minted vs expected                            | no — lifetime count only      |
| Reliability                          | per-epoch blocks over ~20 epochs, plus variance                | **no**                        |
| Reliability history bonus            | pool registration age                                          | no                            |
| Decentralization                     | shared reward address, pledge address, or metadata fingerprint | partial — metadata only       |
| Saturation headroom                  | `live_saturation`                                              | **yes**                       |
| Hard filter: retiring                | retiring-pool set                                              | **yes**                       |
| Hard filter: saturation              | `live_saturation`                                              | **yes**                       |
| Hard filter: metadata validity       | metadata                                                       | **yes**                       |
| Hard filter: pledge not met          | **live** pledge                                                | no — declared only            |
| Hard filter: abandoned               | per-epoch blocks                                               | partial — lifetime count only |

So this is a **best-effort client-side approximation of the design, not the
design**. It is a clear improvement on what it replaces — an arbitrary
provider-order list with no reward reasoning, no saturation guard and no
concentration signal — and it is knowingly short of the ideal in ways the
"Not yet implemented" section below enumerates.

### One correctness fix underneath all of it

Both the yield component and the displayed rate share one reward calculation,
and it was wrong in two ways inherited from Lace v1. Both are corrected here,
because an order computed from an overstated pot is not worth shipping:

- **Relative stake was measured against the delegated total, not the ada in
  circulation.** The ledger's `σ` is a share of circulating supply
  (`maxLovelaceSupply − reserves`); only about half of that is delegated, so the
  saturation point `1/k` came out at ~44M ada instead of ~76M and most real pools
  were priced as if already saturated. Blockfrost publishes each pool's
  `live_saturation`, which settles it: the circulating basis reproduces that
  field exactly, the delegated basis misses it by ~1.74×.
- **The treasury's `tau` share was not deducted** from the epoch pot before
  paying pools, overstating every figure by a further ~25% on mainnet.

Block production is the one place the delegated total is right — a pool is
elected leader in proportion to its share of what is actually staked — so the
calculation uses both totals, each where it belongs.

Corrected, a saturated zero-margin pool estimates ~2.5%/yr, against PoolTool's
measured two-month ROS of 2.0–2.6% for real mainnet pools. The old figures,
3.1–3.7%, were above every pool on that list.

## Decision

**1. The default order is a weighted recommendation score, not a single metric.**
Hard filters first, then the components this data supports, each normalised to
0–1 so the weights mean what they say:

| Component        | Design weight | Renormalised | Source                                                           |
| ---------------- | ------------- | ------------ | ---------------------------------------------------------------- |
| Yield            | 40%           | 53%          | non-myopic member reward, normalised against the best in the set |
| Decentralization | 20%           | 27%          | ticker-family sibling count (partial)                            |
| Headroom         | 15%           | 20%          | `live_saturation` on the design's curve                          |
| Reliability      | 25%           | —            | not computable; see below                                        |

Reliability's 25% is **dropped, not redistributed by inventing a value**. The
remaining weights are renormalised so the score still spans 0–1, and the missing
term is recorded rather than hidden. Substituting a constant would be the same
as dropping it (a constant cancels out of an ordering); substituting a guess
would be worse than either.

Two properties of how this is computed matter enough to state, because getting
either wrong is invisible in the output:

- **The reward ranking runs over the WHOLE pool set, before the hard filters.**
  It prices a pool inside the desired `k` at saturation and everything below it
  at pledge alone, so the cutoff has to be taken against the real network.
  Filtering first frees `k` slots — and the pools a filter removes are
  disproportionately the ones that earned their way to being full — which
  promotes marginal pools into saturation pricing. At saturation their pledge
  differences barely register, so the top of the list flattens: pools that
  should be clearly ranked come out all but tied, exactly where the order
  carries the most weight.
- **Yield is normalised against the best RECOMMENDABLE pool**, not the best pool
  overall, so the top recommendation scores 1 on that component. A filtered pool
  is not a yardstick for advice.

If the network snapshot cannot support the reward maths at all — a persisted
payload written before a parameter existed, a half-loaded snapshot — then
**nothing is recommended**, rather than the remaining components ordering the
list between them. Ordering on headroom and concentration alone would put a pool
at the top with no idea whether it pays its members anything, which is the
failure the fourth hard filter exists to prevent.

**2. Yield comes from the reward specification, and is deliberately blind to
current saturation.** The specification prices every pool inside the desired `k`
at saturation (`max(σ, z0)`), which makes a pool at 2% full and one at 98% full
score identically and penalises only pools already past 100%. That is correct for
the question it asks — what a pool would pay at its target size — and wrong for
the question a delegator is asking, which is what _their_ stake would earn if
they delegated it now. Decision 3 is what supplies the missing half.

**3. Saturation headroom is a curve, and it is the only component that sees how
full a pool is today.** 30–70% scores full marks; below 30% the score eases off,
because a small pool mints blocks rarely and pays erratically even when it is
fair over the long run; above 70% it falls away steeply, reaching zero at
saturation. Pairing this with decision 2 is the whole point of combining the two
sources: neither one alone orders pools the way a delegator needs.

**4. Hard filters disqualify, and disqualification is not the same as hiding.**
Four things take a pool out of the recommended **order** entirely — it carries
no score, and the list's comparator sinks an absent score in _both_ directions,
so it can neither surface as "merely poor" nor float to the top when the
direction flips:

- saturation at or above 95% (there is no room for the delegation being made);
- holding at least 1M ada and never having minted a block — abandoned rather
  than merely new, which is why it is gated on stake: a pool with nothing
  delegated has had no chance to mint;
- **the operator's margin and fixed cost consuming every reward**, so a
  delegator joining would receive nothing;
- nothing identifying the pool. The cause is metadata — never published, or a
  failed fetch or parse — and the test is the ticker specifically, because the
  ticker is the only identity the browse card renders, with no fallback to the
  pool name. Such a card shows a fragment of the pool id instead, which is
  enough to tell two of them apart and to look one up, and not enough to
  evaluate one: a delegator choosing where their rewards go cannot judge a pool
  that publishes no name, no description and no ticker. At epoch 650 this excluded 895 of 2,678 pools, and those were exactly
  the pools with no metadata object at all — none carried a name without a
  ticker, so the narrow test and the broad intent coincide on real data. Most
  are private pools, which are not delegation candidates in any case.

Retiring pools are excluded too, one layer up: the search index drops them
against the network's retiring set before scoring is reached, so they never
enter the recommendation at all.

The identifiability filter deliberately duplicates a rule the list's comparator
already applies — it partitions unidentifiable pools below every identifiable
one, on every sort, not just this one. Checking it in the score as well is what
keeps the two from disagreeing: a score that has to be read alongside a separate
display rule is a score that means nothing on its own.

That last one has to be a filter rather than a low score, and the reason is the
weighting itself. Yield is one component of three, so a pool paying its members
literally nothing still scored ~47% of a perfect score from headroom and
concentration alone: mid-table on a normal list, and _first_ where yields
compress. A weighted sum cannot express "this one disqualifies regardless", so
the filter does.

All of them stay in the list and stay searchable, because a user who goes
looking for one particular pool is not being recommended anything.

Saturation now drives three different behaviours at three different
thresholds, which is deliberate rather than drift. They answer different
questions, and only the middle one is set here:

| Threshold | Behaviour                               | Question it answers                     |
| --------- | --------------------------------------- | --------------------------------------- |
| 60% / 80% | the bar turns amber, then red           | how full is this pool, at a glance?     |
| **95%**   | dropped from the recommendation         | should new stake go here?               |
| 99%       | a warning on the delegator's stake card | is my existing delegation being harmed? |

The gap between 95% and 99% is the important one, and it is not an
inconsistency. Excluding at 95% is forward-looking: the delegation being
considered is itself what would tip the pool over, so the wallet stops
recommending while there is still headroom to consume. Warning at 99% is
backward-looking: it fires when a delegator's existing rewards are actually
being diluted. A pool between the two is a poor destination and not yet a
problem for those already in it — both statements are true at once.

**5. Decentralization is measured by ticker family, and that is a heuristic.**
The design detects siblings from a shared reward address, pledge address or
metadata fingerprint; the bulk endpoint carries no `owners` and no
`reward_account`, and fetching them is one request per pool. Multi-pool operators
overwhelmingly number their tickers (`WPBJ1`/`WPBJ2`/`WPBJ3`, `GMO1`/`GMO2`), so
the ticker family is the metadata fingerprint we can afford. A pool's score is
divided by its family size. The error runs in **both** directions, which is
measurable: over the 2,678 mainnet pools of epoch 650 it correctly groups large
operators who number their tickers (`UPBIT` at 20 pools, `BNP` at 36), misses
any operator who disguises theirs, and wrongly groups unrelated pools that
happen to share a ticker. The worst of that last class was placeholder tickers —
`N/A` was held by 18 pools under 18 different reward addresses — so placeholders
are now treated as no ticker at all, alongside a ticker too short to be
distinctive. A pool with no usable ticker counts as a single-pool operator rather
than being punished for it.

Identical-ticker collisions between genuinely unrelated operators (two pools both
called `CHEAP`, two called `ELITE`) still over-penalise, and cannot be told apart
from one operator using several reward addresses without the operator identity
the bulk endpoint does not carry. In the epoch-650 snapshot no penalised pool
reached the top 25, so the effect is real but not currently shaping the head of
the list.

**6. The score is never displayed.** It is a weighted, partly-heuristic,
0–1 comparison quantity with a quarter of its intended weight missing. Cards lead
with **saturation** instead, which is a fact rather than a judgement. The
estimated annual rate remains available as an explicit sort, worded as an
estimate.

**7. The estimated rate is validated against sources outside this repo.** A
parity test against Lace v1's ROS fixtures is what allowed both errors in the
Context to persist, so the estimate is now pinned by reproducing Blockfrost's
published `live_saturation` from our own denominator, and by a magnitude band
anchored on PoolTool's measured ROS which fails if the figure re-inflates.

## Not yet implemented

Deliberately deferred, each blocked on data rather than on a decision:

- **Reliability (25% of the intended weight).** Needs per-epoch blocks minted and
  active stake per pool over ~20 epochs, plus the variance of that ratio. Until
  it lands, a pool that misses its blocks ranks level with a reliable one of
  equal fees, pledge and headroom. This is the largest single gap.
- **Luck-adjusted yield.** The same per-epoch history would let the yield
  component use realised performance instead of assuming every pool makes its
  blocks.
- **Decentralization from operator identity**, replacing the ticker heuristic.
- **The pledge-not-met filter.** Needs live pledge; `live_stake >= declared_pledge`
  is the available proxy and is already applied.
- **Top-tier shuffle.** The design's anti-feedback-loop step: treat everything
  within 5% of the top score as equivalent and order that group by a deterministic
  per-wallet seed, so the wallet's own recommendation cannot saturate whichever
  pool it happens to rank first. Implementable with today's data — it needs a
  wallet-scoped seed plumbed to the list, and it makes the top-tier order
  intentionally differ per user, which the E2E and screenshot suites currently
  assume it does not.

### What the API would need

To close the above, a provider would have to offer, in bulk rather than per pool:

- per-epoch blocks minted and active stake per pool for a trailing window
  (~20 epochs) — closes reliability and luck-adjusted yield;
- `owners` / `reward_account` on the bulk pool listing — closes decentralization;
- live pledge on the bulk listing — closes the pledge filter;
- pool registration date — closes the operating-history bonus.

A bulk history endpoint, or moving ranking server-side, would close all of them
at once.

## Consequences

**Positive**

- The order reflects reward reasoning, saturation headroom and operator
  concentration together, rather than an arbitrary key or any single metric.
- A near-saturated pool cannot be recommended at all: a pool at 97.98% of
  saturation, which the yield metric alone would rank second, is excluded.
- Oversaturation still dilutes through the yield component, so a pool cannot
  advertise a rate its members will not keep.
- A pool cannot climb the list merely by being small, and cannot climb it by
  being one of forty under the same operator.
- The saturation bar in the list is coloured on the same thresholds the details
  and delegation sheets use, so a pool those screens paint red cannot read as
  neutral where the choice is actually made.

**Neutral**

- Two derived figures exist per pool — a score used only to order, and an
  estimated rate shown only on request. The distinction is deliberate and the UI
  never mixes them.
- The score is computed once per search-index build over the whole eligible list,
  because yield depends on whether a pool places inside `k` and concentration on
  how many siblings it has.

**Negative**

- **Reliability-blind.** See "Not yet implemented". A quarter of the intended
  decision weight is absent.
- **The concentration signal is a heuristic** and will miss operators who do not
  number their tickers.
- **Weights are asserted, not tuned.** They come from the design document; no
  measurement of delegator outcomes has been done against them.
- The `k` cutoff assumes the loaded summaries are the network's pool set. That
  holds for `pools/extended` today (all pools, minus retiring ones and those
  failing the pledge proxy), but a provider that narrowed the set would shift
  every score with no visible symptom.

## Alternatives considered

**Order by the estimated annual rate.** The obvious candidate, since it is the
figure users ask for. Rejected as the default: it is the naïve approach the
ranking specification opens by rejecting, and it promotes the pools whose
apparent advantage is likeliest to evaporate — a pool with little live stake
divides the same block rewards among few delegators, so its rate is highest
exactly while it is least able to sustain it. Retained as an opt-in sort, where
the user is asking for today's figure rather than being advised.

**Order by the non-myopic reward alone.** Attractive because it is a single,
specified metric with no weights to argue about. Rejected because it puts a
97.98%-saturated pool second: faithful to the specification and still poor
advice, since the metric prices every top-`k` pool at saturation and so cannot
see headroom below 100%, while the delegator's own stake is what pushes such a
pool over. Decision 3 exists to cover exactly this.

**Keep the default neutral — ticker order — until the data supports the full
algorithm.** Rejected: alphabetical order is not neutral in effect, it is still a
recommendation, just one with no reasoning behind it, and it withholds the
saturation and fee information the wallet can stand behind today.

**Wait for a bulk history endpoint and ship nothing until the algorithm is
complete.** Rejected: the list is already recommending pools by whatever order
the provider returned. Shipping a partial, documented approximation is strictly
better than continuing to recommend arbitrarily while waiting.

**Display the score.** Rejected: a weighted, partly-heuristic quantity missing a
quarter of its weight. Printing it would lend it a precision it has not earned.

## Related

- `Stake Pool Ranking in Cardano`, A. Byaly & J. Corduan, IOHK, 2023.
- Lace's internal pool-recommendation design — the hard filters, the four
  weighted components and the top-tier shuffle this approximates. Its substance
  is restated in full above, so nothing here depends on reading it.
- `Design Specification for Delegation and Incentives in Cardano`, SL-D1
  §5.5–5.6 — the reward and desirability functions the yield component
  implements.
- ADR 17 (internal): Staking Problems Priority Order — how pool _problems_
  such as retirement or oversaturation are surfaced to the user as warnings,
  which is a separate concern this ordering deliberately does not encode.
