This is a proposal for how Carla, Jonathon, and I will tackle the D2 deliverable. This isn't a full tech plan but has duration commitments, nuance call-outs, and decisions.

## The commitment

We propose D2 in two phases.

Phase 1 (2 weeks)
We take the current migrate-wallet POC to production readiness on the 3 platforms: extension, mobile, and hardware. Concretely, at the end of the 2 weeks:

- the migration flow runs on extension, mobile, and hardware and is merged to main (the 2.2 release line) behind the MIGRATE_WALLET feature flag
- the destination can be a freshly created wallet, an existing Lace wallet, or a hardware wallet (which devices is question 1 below)
- every wallet state the single-tx sweep can't migrate correctly or safely is detected during discovery and refused. The user is told we can't migrate their wallet yet, and that support arrives in a later release (the states and their handling are in "Wallet corner cases and how Phase 1 handles them")
- test coverage: unit/marble, storybook integration, and e2e on extension and mobile, with hardware destinations verified manually on physical devices (question 8)

These bullets assume questions 1, 2, 3, 8, and 9 below are answered.

Phase 2 (estimated at the end of Phase 1's week 1, when the refusal list closes)
We lift the Phase-1 refusals case by case, in the order listed in the next section, turning each one into a supported migration. The non-migratable roles (corner case 4) are the exception, refused permanently, since their on-chain identity can't move to a new seed.

## Wallet corner cases and how Phase 1 handles them

The Phase-1 sweep is a single transaction that spends every UTxO, withdraws the available rewards, and sends everything to the destination. It does not deregister the stake key, the account's on-chain staking registration (see "No stake-key deregistration" for why, and how a later follow-up sweep collects the pending rewards and the 2 ADA deposit).

The common wallet shape Phase 1 handles is a single account whose assets and available rewards fit one tx. The states below are each detected during discovery and handled as noted, refused unless stated otherwise. We have this table as a quick index into the details below.

| #   | Wallet state                                       | Phase 1                  | Detection                       |
| --- | -------------------------------------------------- | ------------------------ | ------------------------------- |
| 1   | Too large for one tx                               | Refused                  | dry build exceeds size cap      |
| 2   | Rewards, not delegated to abstain or no-confidence | Refused                  | stake key vote-delegation state |
| 3   | Rewards or deposit, zero UTxOs                     | Refused                  | UTxO count                      |
| 4   | Pool operator, proposer, or DRep                   | Refused                  | in-flow question                |
| 5   | Multi-account                                      | Supported (workstream A) | account-index scan              |
| 6   | Not enough ADA for the fee                         | Refused                  | dry build fails to balance      |
| 7   | Byron-era funds                                    | Disclosed                | undetectable                    |

### 1. Wallets that are too large for one transaction

Cardano has a tx size limit. In Phase-1 the migration tool detects if the tx that _would_ be submitted goes over this limit (via a dry-run build) and if it does, refuse to do the migration. See "Multi-transaction sweeps" for the chunked-sweep solution that lands after Phase 1.

### 2. Rewards-bearing wallets not vote-delegated to abstain or no-confidence

Cardano only allows a reward withdrawal from a vote-delegated stake key (see "Multi-transaction sweeps"). Phase 1 migrates a rewards-bearing wallet _only_ when it is delegated to one of the two placeholder targets: **abstain** or **no-confidence**. Every other rewards-bearing wallet is refused, in two groups.

- A wallet not vote-delegated at all.
- A wallet delegated to a real DRep could withdraw in one tx, but only while that DRep stays registered. A deregistered DRep voids the delegation, so supporting this class safely needs an on-chain registration check and a fallback to the two-tx path (see "No stake-key deregistration"), which Phase 1 defers and refuses instead. This wallet state is detected by the stake key's on-chain vote-delegation state.

### 3. Rewards or deposits present but zero UTxOs

This wallet leaves no input that could pay fees (see "The fee-input problem"). Detected by UTxO count. The refusal screen names the amounts found (the stuck rewards or deposit) so the user sees what couldn't move.

### 4. Pool operators, proposers, and DReps

Refused, permanently. Their on-chain role can't migrate to the new seed (see "Non-migratable roles"). Detected by asking the user in the flow, "are you a pool operator, a DRep, or a governance proposal submitter?" (scope decision d), refused on a "yes" to any of the three.

### 5. Multi-account wallets

Supported if workstream A lands in Phase 1, otherwise refused wholesale. The flow scans successive account indexes and sweeps each active account, since many real wallets have more than one account. Wallet software usually creates accounts consecutively, so the scan stops after a run of unused indexes, a gap of 10 (tunable, revisit in workstream A). The success screen reports only the accounts actually swept, not "everything moved". The fallback is to refuse any multi-account wallet on detection rather than sweep account 0 and silently drop the rest.

### 6. Not enough ADA for the fee

A wallet can hold UTxOs yet be unable to cover the fee plus each output's min-ADA, the per-output ADA floor Cardano requires (token-heavy but ADA-poor wallets, dust). Detected by the dry build failing to balance. The refusal screen names the amounts found so the user sees what couldn't move. Distinct from case 1, so the builder reports typed failure reasons (size overflow versus cannot balance).

### 7. Byron-era funds

Disclosed, not refused. Some wallets hold ADA on pre-Shelley (2020, Byron-era) addresses in the old format. Discovery derives only current-format (Shelley) addresses from the seed, so those funds are invisible to the flow. We can't detect them, so we can't refuse on them. The wallet migrates its Shelley funds normally, and any Byron-era funds are left behind. The success copy states that Byron-era addresses are not swept, so a "successful" migration never silently leaves funds behind. Detecting Byron funds (question 10) is a later nice-to-have.

This list may not be complete. If you know a wallet state that would make the sweep fail, lose funds, or put a large amount at risk, tell us (the shared Slack channel, or comments here) so it gets a guardrail before release. The list closes at the end of Phase 1's week 1: cases surfaced after that default to Phase 2, unless they name a fund-loss risk.

## Mechanics and Phase-2 design

These items own the mechanics, why a corner case is hard and how Phase 2 treats it. The corner cases above own the user-facing layer (detection rules and refusals) and point here for the why.

### 1. Multi-transaction sweeps

A single transaction is the natural design, but two things break it.

- The obvious reason: a wallet with lots of utxos or tokens doesn't fit in one tx since Cardano caps tx size, so we chunk into tx_1 through tx_N, largest utxo value first.
- The less obvious reason: Cardano's Conway era added a rule that a stake key can't withdraw rewards unless it has vote-delegated to a DRep. Any wallet that only ever staked and never touched governance fails this check (we hit it live on preprod), so the withdrawal is rejected (ConwayWdrlNotDelegatedToDRep).

The fix for the second is a vote-delegation to abstain, but the ledger validates a withdrawal against the state from before the tx's own certs apply, so the abstain-delegation can't share the tx with the withdrawal. It has to land in an earlier tx, so the sweep needs at least 2 txs for these wallets.

Both txs can sit in the same block if tx_2 spends an output of tx_1 and we submit them back to back (a block applies its txs in order, a node's mempool validates each against the state the earlier ones leave, and chaining unconfirmed outputs is standard on Cardano). One caveat: that requires both submits to reach the same node in order, and our production provider (Blockfrost) is a load-balanced fleet with no way to pin a node. So tx_2 bouncing and being resubmitted after tx_1 lands (a one-block wait, not a failure) is the expected path in production, and the Phase-2 executor is designed around it.

### 2. No stake-key deregistration

Deregistering closes the reward account, which forfeits to the treasury the staking rewards that were earned but not yet paid out (Cardano pays them a couple of epochs late), hundreds of ADA for a sizeable staker. So the sweep spends the UTxOs and withdraws what is available, but leaves the stake key registered, and a later follow-up sweep of the old wallet collects the pending rewards and the 2 ADA deposit. One caveat: for a compromised source those later rewards land on a wallet the attacker also holds, so deferring recovers them only when the source isn't attacker-controlled.

With that default, the per-wallet cases are:

- stake key not registered: nothing to do beyond sweeping the utxos
- registered, no claimable rewards: sweep utxos, leave the key registered, and collect the 2 ADA deposit later in a follow-up sweep of the old wallet
- registered, claimable rewards, currently vote-delegated: withdraw the available rewards and sweep, leave the key registered. If the delegated DRep has since deregistered, the delegation is void and the wallet is handled as the not-delegated case below. The pending rewards and the deposit come later in a follow-up sweep.
- registered, rewards, not delegated: withdrawal needs an abstain-delegation in an earlier tx (Conway, see "Multi-transaction sweeps"), so this is the two-tx case that corner case 2 refuses in Phase 1, without deregistration.

Two execution details:

- Cardano requires a withdrawal to exactly match the on-chain balance at submission (rewards tick up at epoch boundaries) and the signing prompt between build and submit is human-paced, so the executor re-fetches right before building and re-verifies after authentication, rebuilding if the balance moved.
- The follow-up sweep deregisters the stake key to reclaim the deposit, and two deregistration rules apply:
  - Cardano will not deregister while rewards are still pending, so this sweep waits until those rewards have landed.
  - The deregistration has to state the deposit that was actually paid when the key was registered. The provider does not report that amount, so we use the current standard deposit (2 ADA, unchanged since Shelley). If it ever fails to match, the transaction is rejected and no funds are lost.

### 3. The fee-input problem

In the vote-delegation case (two-tx, Phase 2), the final tx has an input problem. Value-wise the withdrawn rewards count toward covering that tx's fee (the deposit is not reclaimed here, it comes later via cleanup). The real constraint is that every Cardano tx must have at least one input (a utxo it spends), no matter how much value the withdrawal brings in, and after tx_1 sweeps every utxo the source has none left to be that input.

One alternative is to pay the final tx's fee with an input from the destination wallet, clean but meaning one tx signed by two wallets. We read the Lace signing code, and each signer instance binds one wallet and one auth prompt, there's no two-wallet path today. Building one means signing twice and merging witness sets, plausible but unproven, so it's a spike, not a commitment.

The Phase-2 plan is a "hold-back", in which tx_1 deliberately leaves ~2 ADA (ADA-only, no tokens) at the source and the final tx spends that as its input (~2 ADA because any output must carry roughly 1 ADA of min-ADA, plus margin). The hold-back must be ADA-only, because the final tx consumes it as a pure fee input and tokens can't be burned into a fee (a token-carrying hold-back would force the final tx to emit a token output with its own min-ADA, and the min-ADA floor of a multiasset UTxO scales with the token bundle, so the ~2 ADA sizing itself breaks). Because the hold-back input belongs to the source, every tx stays source-signed, so the hold-back sidesteps the two-wallet signing the destination-funded alternative would need.

In the window between tx_1 and the final tx, an attacker holding the leaked seed could spend the hold-back or race the withdrawal. That's a loss ceiling of roughly the rewards plus the ~2 ADA hold-back, not a recovery guarantee, since the attacker holds the same seed the user does. The same-block chaining from "Multi-transaction sweeps" shrinks that window to near zero.

We'll also want to spike the two-wallet signing during Phase 2 because it would rescue the zero-utxo wallets (scope decision c below) and D4 needs it anyway.

### 4. Non-migratable roles

A pool's registration and pledge, a proposal's deposit and lifecycle, and a DRep's id and delegator base are all bound to the old seed and can't be reissued under a new one, so there is no clean migration to build (corner case 4). Deregistering these accounts would also burn deposit refunds. A retiring pool's 500 ADA and a resolved proposal's 100k ADA refund only if the reward account is still registered at refund time, so closing it would burn them to the treasury.

### 5. Racing an attacker

The design assumes an attacker (or bot) may already hold recovered keys for the source wallet but hasn't acted yet and is watching those addresses--for them our first broadcast tx might be an alarm bell. The first thing they might see is tx_1 landing and from that moment the remaining txs are potentially being raced. In Phase 1 the sweep is a single tx, so the third rule below is the operative one. The rest govern Phase 2's multi-tx plans:

- the biggest utxos go in the earliest txs, so if someone races us partway through, they get the least
- we never hold a built-but-unsubmitted tx, the whole plan submits as fast as the chain accepts it
- before each submit we save the tx hash, so if a submit times out we look the hash up on-chain before retrying, instead of blindly resubmitting and reporting a success as a failure
- if a utxo gets spent out from under us, we re-scan the wallet and rebuild the remaining txs
- how the user authorizes signing across a multi-tx plan is an open question with a real trade-off, see question 11 below

## Workstreams (3 engineers)

Workstream A: guardrails and sweep hardening

- the detection checks from the corner-cases section: dry-build checks with typed failure reasons (size overflow versus can't balance), the conservative vote-delegation check, zero-utxo count, and attestation capture
- the multi-account scan that walks account indexes (allowing a gap of 10) and sweeps each active account, with reject-on-detection as the fallback if it can't be finished in Phase 1
- the sweep that leaves the stake key registered: spend UTxOs and withdraw available rewards, then collect the pending rewards and deposit later in a follow-up sweep of the old wallet
- the same-seed guards: refuse a source seed that derives the destination wallet or an already-loaded wallet
- the refusal screens and copy, the refusal aftermath (the imported source wallet is unloaded and the copy tells the user what to do next), and the error taxonomy behind them
- sweep executor hardening from "No stake-key deregistration", the post-authentication balance re-check
- extension-side storybook integration and e2e coverage (the refusal flows live here)

Workstream B: mobile

- starts with a bring-up spike, timeboxed to the first two days. The flow's building blocks (wallet creation, second-wallet import, signing, provider calls) already run on mobile in production flows, but the migration wizard itself has only ever run on the extension. The spike gets the module loading and the wizard rendering on a real mobile runtime: if that surfaces deeper platform work, we know by day 2 and re-scope the mobile bullet, instead of discovering the gap in week 2.
- module loader registration on the mobile app and any mobile-specific integration the flow needs
- storybook integration and e2e coverage on the mobile side, and the mobile QA process with Lace

Workstream C: destinations and flow screens

- the user's destination choice: a freshly created wallet, an existing Lace wallet, or a hardware wallet
- hardware destination support (for the devices Lace confirms). Scope note that keeps this small: the destination never signs, the source wallet signs every sweep tx, so all the wizard needs from a hardware wallet is a receive address.
- a hardware probe mirroring B's spike, also in the first two days: a code read answering whether "connect a hardware wallet and get a receive address" already exists as a reusable flow on each platform, plus a device smoke test as soon as question 8's units arrive. Hardware-on-mobile is the least-proven combination of the phase, so the probe covers that cell explicitly.
- the optional BIP39-passphrase input on seed entry (scope decision f)
- the review and success screens, including the disclosures the corner cases require: Byron-era addresses not swept, the claim scoped to the accounts actually swept, that the old wallet's stake key stays registered so its pending rewards and deposit are collected in a later sweep, and funds arriving at an unstaked destination with a re-delegate nudge

## Working process

- We work off the existing migrate-wallet branch. It needs a rebase onto main (the 2.2 release line), which still needs an owner (question 2) and gates the merged-to-main bullet in the commitment.
- Trunk-based development. Lace is setting up a shared Slack channel.
- John Pokroi (program manager) is the day-to-day contact. Michael is the engineering manager. Rhys has the last word and his team will depend on our work.
- This is the flagship feature for the release after the next one.

## Proposed scope decisions

a. Phase 1 delivers mobile and hardware destinations, multi-account support, and the sweep that leaves the stake key registered. The remaining corner-case sweep support is delivered in Phase 2, per the list above, except the non-migratable roles (corner case 4), which stay refused permanently.

b. Hold-back and all multi-tx machinery ship in Phase 2, with the two-wallet signing spiked during Phase 2 and adopted later if it turns out easy.

c. Zero-UTxO wallets (corner case 3) stay refused through Phase 2's first cut: their real fix is destination-funded fees, which arrives with the two-wallet-signing work.

d. Role detection: the flow asks the user directly ("are you a pool operator / DRep / proposal submitter?") and refuses on a "yes". These roles have no clean migration (corner case 4), so FR-10 asks the user rather than detecting the role on-chain. Provider-side detection is possible but not worth building, since the outcome is refusal either way.

e. Keystone: FR-4 names it, but the platform has zero Keystone support today (hardware types are Ledger|Trezor). We treat it as out of D2 unless someone says otherwise.

f. BIP39-passphrase ("25th word") sources: entering just the 24 words of a passphrase-protected wallet derives an empty-looking wallet, which would be confusing (and wrong). The SDK already supports the passphrase and Lace just doesn't pass it, so we'll add an optional passphrase input in Phase 1. Cheap, and it prevents a wrong "empty wallet" refusal on a wallet that isn't empty.

Assumptions we proceed on unless corrected

- The seed is persisted only as a standard encrypted wallet, and we read the acceptance criterion's "not persisted, zeroed after signing" line as meaning no plaintext persistence plus in-memory zeroization (per SR-1).
- Screens are assembled from ui-toolkit, no separate design phase.
- We develop against main (2.2) once the rebase lands.

What we need from Lace

1. Which hardware devices does Phase 1 commit to: Ledger and Trezor (what the platform supports today), or a subset?
2. Who owns the rebase of the working branch onto main, and when?
3. Mobile process: does our work flow through a standard process, who owns mobile QA, and what device or simulator setup should we use?
4. Review turnaround: our two weeks assume roughly 24h turnaround on PR reviews. Is that realistic?
5. What does "delivered" mean for Phase 1: merged, or live behind the feature flag, and for mobile does app-store review count?
6. Who writes the real es/ja translations for the copy we create, including the refusal copy?
7. Any UX design review required beyond ui-toolkit assembly, particularly for the refusal screens?
8. Hardware test devices: can Lace provide or lend Ledger/Trezor units?
9. Which network(s) should the e2e migration test run against?
10. Can the provider report Byron-era funds for a seed, so corner case 7 gets a real detection instead of a success-copy disclosure?
11. (Phase 2) How should the user authorize signing when the sweep plan is multiple txs? Two options with a real trade-off:

- Once per plan: the user reviews the full decoded plan, enters their password once, and we build, sign, and submit every tx in one burst with no human pause between them (chaining makes this possible, each tx's hash is known as soon as it's signed). Best for the racing posture in "Racing an attacker" and for UX, but the auth secret and key material stay in memory for the whole burst (seconds), and it diverges from Lace's current per-sign prompting, so it needs an auth-reuse mechanism and security sign-off. A rebuild after a raced input re-prompts either way.
- Once per tx: matches Lace's existing signer behavior exactly (every sign call prompts, no new machinery) and bounds key residency per tx, but it puts a human typing a password between txs right after tx_1 has announced the migration to anyone watching, which is the exact gap "Racing an attacker" tries to close, and it's N prompts of UX.
