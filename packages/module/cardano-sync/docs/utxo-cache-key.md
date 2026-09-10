# When a UTxO fetch may be trusted as settled

This describes the **design** behind `canTrustFetchAsSettled` in
`src/store/side-effects/track-account-utxos.ts` — why the rules exist, how they
rank, and which properties must survive a refactor. It deliberately does not
restate what each rule does: the code says that, and a second copy would drift.
Read it before changing that function.

## The gate it guards

Each Cardano account has a persisted `UtxoCacheKey` derived from its top
on-chain activity, its stake keys and its address count. A fetch runs only when
the computed key differs from the persisted one. **Advancing the persisted key
asserts "this fetch is the settled truth for that anchor"** — and it closes the
gate: from then on the two keys match, so nothing refetches until the account's
next transaction moves the anchor.

That is why a wrong advance is not a transient glitch. It is a latch: it
survives reloads, records no failure, and self-heals only on the account's next
transaction — which for an abandoned account never comes. Both proofs below
exist because that latch closed in production — once on a spend, where an
emptied account reported its pre-spend balance indefinitely, and once on a
receive, where an incoming transaction never reached the balance at all.

Withholding the key is cheap by comparison: the UTxOs are still written to the
store, the failure still auto-dismisses, and the tip-driven trigger keeps
re-verifying. **When in doubt, withhold.**

## The four rules

Two of them are _proofs of staleness_ — evidence the provider has not applied
the anchoring transaction — and two are _reasons to accept_:

| Rule                   | Kind                                                              |
| ---------------------- | ----------------------------------------------------------------- |
| Spent-outpoint proof   | proof of staleness: an outpoint the anchor spent is still present |
| Missing-output proof   | proof of staleness: none of the anchor's own outputs are present  |
| Confirmation-depth     | reason to accept: the tip is far enough past the anchor's slot    |
| Ownership-only advance | reason to accept: the key moved on address discovery alone        |

## Property 1 — proof outranks intent

Both proofs are evaluated **before** the manual-retry bypass. A retry exists to
get past a fetch _failure_, not to accept a demonstrably stale set, and a
provider that has just recovered may still be serving one. Moving either proof
below the retry check reopens the last door into the latch.

## Property 2 — the two proofs are not symmetric

This is the one most likely to be lost in a refactor, because the proofs look
like mirror images and invite being merged into one parameterised helper. They
must not be.

**The spend proof reasons from presence, and is unforgeable.** An outpoint the
anchor consumed coming back in a fetch can only mean the provider has not
applied that transaction. Nothing else produces that observation.

**The receive proof reasons from absence, which has an innocent cause.** An
output the anchor paid us can be missing because a _newer_ transaction spent it
— a same-block sibling that wins the timestamp-tie sort, or the user's next
spend. Absence is therefore not evidence on its own, and the proof compensates
in two ways:

1. It subtracts outpoints consumed by any **loaded** activity, pending included,
   before arming (`unspentAnchorOutpoints`).
2. Its predicate is **ALL** remaining outpoints absent, never _any_ missing —
   one present output proves the provider applied the transaction, so a
   partially-served multi-stake-key fetch cannot read as staleness.

Collapse the two and you reintroduce a permanent withhold on a same-block
sibling spend.

## Property 3 — empty means unknown, never "none"

Both proofs read metadata that older persisted activities do not carry, so an
empty list is _no information_ and must fall through to the depth rule rather
than arm anything. This is what makes the feature backward-compatible without a
persistence migration.

## Known residual exposures

The subtraction in property 2 is evidence-based, so it **under**-subtracts —
which is the safe direction, but it means the receive proof can withhold against
a correct provider until the spending transaction reaches the activity feed:

- A pending activity written without Cardano metadata reports nothing spent, so
  it cannot disarm the proof until its confirmed counterpart maps.
- Rolled-back activities are never pruned, so a reorged anchor keeps its proof
  armed indefinitely. This affects **both** proofs, but the receive proof more
  widely: the spend proof clears once the chain applies the anchor, while the
  receive proof clears only when the _spending_ transaction is mapped.
- Pending activity rows never expire.

## Pipeline note

The natural trigger's `distinctUntilChanged` compares the cache key and the tip
slot, not the subtracted outpoint set. A spend that loads in a later emission is
therefore deferred to the next tip rather than applied immediately. That is
bounded (one block) and covered by a test; do not "fix" it by widening the
comparator without measuring the extra fetches that would cause.
