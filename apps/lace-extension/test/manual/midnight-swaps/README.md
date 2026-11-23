# Midnight swap test dApp

Local manual testing for the legacy Lace extension's `makeIntent`,
`balanceSealedTransaction`, and `submitTransaction` connector methods. This fixture
is separate from the production extension bundle and the deferred Lace SDK apps.
No new dependencies are required.

## Start

From the active repository root, using the Node version in `.nvmrc`:

```bash
npx nx run lace-extension:midnight-swaps-serve
```

Open <http://127.0.0.1:8093> in two browser profiles with the extension enabled.
Use one wallet as maker and the other as taker. The server binds to loopback and
serves only the built fixture. Stop it with Ctrl+C. This does not start or reset a
Midnight network.

## Test a swap

1. Select the same test network and ledger epoch in both profiles. Discover and
   connect each wallet. Record the extension build and case ID. Confirm the
   addresses and capture starting balances before building anything.
2. In the maker profile, choose a funded token to give and a token to receive.
   Token identifiers are 32-byte hex strings. Amounts are integer base units,
   without decimal separators. For the initial cross-kind tests, give shielded
   and receive unshielded, then repeat in the other direction.
3. Set the receive address to the maker's address of the selected receive kind.
   Keep maker fee payment off and ensure the taker has usable Dust. Create the
   offer and approve it in Lace.
4. Compare the decoded transaction with the agreed exchange. Copy the entire
   offer JSON into the taker profile, or save and open its file. Click **Load and
   inspect offer**. Imported metadata is only a label, not a verified claim.
5. In the taker profile, click **Balance loaded offer** and approve in Lace.
   Review the resulting transaction, then explicitly click **Submit balanced
   transaction**. Balancing never submits automatically.
6. Wait for inclusion and both wallets to sync. Verify all four token changes,
   check Activity, and capture balances again. Save a report from each profile.
   Repeat on v8 and v9. A returned submit call is not a settlement verdict.

The page shows available balances. Reservations can change those before
settlement. Dust also regenerates or decays, so its elapsed-time balance delta
is not an exact transaction-fee oracle.

## Scope and limits

- Current Lace ignores `intentId`, including `random`. The fixture forwards the
  selected value and displays actual decoded IDs. A mismatch remains a known
  connector defect. Shielded-only offers can contain no ledger Intent.
- The inspector uses the pinned v8/v9 ledger packages to decode the actual bytes.
  It does not verify proofs, signatures, fee sufficiency, or chain inclusion.
  Shielded recipient verification requires the receiving wallet.
- Each network/account change requires a connection check before the next wallet
  action. Reconnect after changing accounts. Editing or loading a different offer
  invalidates the page's balanced transaction.
- Clearing the page or deleting an offer file does not revoke that offer or
  release reservations. Rejecting an approval and waiting for offer expiry are
  different tests. No connector cancellation API is implied.
- The fixture does not use `getTxHistory`, which Lace does not implement. Use
  Activity and confirmed balances for acceptance.
- Reports contain addresses, balances, request details, identifiers, and errors.
  They stay in the page until explicitly downloaded. Service URL query strings
  and credentials are removed from recorded errors. Offer files additionally
  contain the authorized transaction bytes. No secret keys are requested.
- The offer JSON is a test fixture format, not a Midnight offer-file standard.
- No real-funded swap, complete proof verification, or network acceptance is
  implied by the browser smoke test.

## Checks

```bash
npx nx run lace-extension:midnight-swaps-typecheck
npx nx run lace-extension:midnight-swaps-smoke
npx nx test @lace-module/midnight-sync -- --run test/store/make-intent-receipts.test.ts --coverage.enabled=false
```

The smoke target builds the fixture, starts an isolated loopback server on port
18093, and runs a headless browser with a synthetic connector. It tests v8/v9
WASM decoding, bigint preservation, rejection/retry, account-change protection,
separate submission, duplicate-submit protection, and invalid imports. It uses
Playwright's installed Chromium. Set `CHROME_PATH` to an installed Chrome binary
if needed. Both browser and test server are closed afterward.

The receiving-leg regressions use Lace's grouping functions, the real SDK facade,
and real seeded shielded/unshielded builders. Network, Dust payment, lifecycle
storage, signing, and proving are not exercised end to end by those tests.

The broader test matrix and outstanding contract research are in Obsidian:
`iohk/Projects/lw-15105/makeIntent tests and intentId implementation plan.md`.
