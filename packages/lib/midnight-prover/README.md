# Midnight proof worker

Internal workspace library for the extension's local prover. It contains no
Chrome or Midnight SDK dependencies. The application supplies the transport,
document lifecycle and worker's computation provider.

`lace-extension` installs the client at its service-worker composition root.
The offscreen document owns the queue and a dedicated worker; synchronous WASM
never executes in the service worker. Document ownership goes through
`@lace-lib/extension-offscreen`, also used by `lace-extension-shell`.

## Lifetime and failures

- Jobs have caller-generated IDs; repeated starts are idempotent.
- One worker executes jobs sequentially. Up to eight queued/retained jobs are
  accepted; completed results expire after five minutes or explicit release.
- The worker stays warm for 30 seconds after computation, retaining key caches.
  Once results are released/expired, idle cleanup terminates it.
- Cancellation passes an internal AbortSignal through provider hops. HTTP and
  Temenos requests abort; native worker cancellation terminates that worker, and
  the next job gets a fresh one. Remote servers may still finish computation.
- Worker errors reject the job. There is no fallback to service-worker execution.
- Both Chrome boundaries use acknowledged 256 KiB byte chunks (hex on the wire)
  and decimal big integers. SHA-256 validates complete uploads before handles
  become usable. Repeated content is reused; mutable caller buffers are hashed
  afresh on each call. Originals are never detached or modified.
- The document and worker transfer owned copies of inputs and completed proofs.
  Cached keys and provider-owned result buffers remain available for subsequent calls.
- A reconnecting caller can retrieve a result by ID after service-worker restart.
  Resuming an entire wallet transaction requires separate wallet orchestration.

The dApp adapter uses this same protocol through its existing remoting layer;
`getProvingProvider`, `check`, `prove` and their public types are unchanged. The
service worker binds commands to the authorized origin, tab, frame, document,
account and network before forwarding to the selected proof backend.

The dApp's existing `prove()` call now sends an internal `checkAndProve` job:
one input transfer, one queue slot, checking followed by proving, and one activity.
A failed check prevents proving. Public `check()` still performs only a check;
wallet transaction orchestration retains its existing proving path. Callers that
explicitly invoke `check()` before `prove()` will still request an extra standalone
check; the proof lab uses only `prove()`. No new public dApp methods are exposed.

Combined jobs retain their checking/proving stage separately from material-loading
progress so frequent download events cannot hide the current step. Activity
snapshots contain only step statuses and never retain raw inputs or errors. The
background store expires successes after five seconds, retains at most 50
completed activities, and never evicts active work. Failures remain dismissible
until evicted by the history limit. Cleanup does not require an open wallet UI.

Each receiver reserves at most 256 MiB of payload storage, 64 entries, eight request leases and four
incomplete uploads. A request leases inputs while uploading, then pins them
through queued/running computation. Unused material and abandoned uploads expire
after 60 seconds; pressure evicts only unleased entries. Terminal job leases
expire with the job after five minutes; normal client completion releases them
immediately. Offscreen cleanup runs every 30 seconds. The service worker also
sweeps on requests and loses its cache when retired. Handles do not survive their
owner's restart; a missing handle rejects, without automatic transaction replay.

Storage is session memory only: no disk quota, persistent cache or wallet-data
cleanup is involved. These are transport retention budgets, not limits on total
browser memory: there can be caches at both hops, transfer copies, browser JSON
buffers and WASM allocations. Chunking bounds individual messages, not proof
duration or the memory required to compute a proof. This library does not make oversized proofs
safe or add a user-facing cancellation control.

## Verification

Run `nx run @lace-lib/midnight-prover:test` for queue/transport coverage and
`nx run lace-extension:test-prover-runtime` for a disposable browser test. The
latter sends a k17-sized key and result through real Chrome Port and runtime
messaging, attaches no debugger, blocks a synthetic worker for 65 seconds, exercises
cancellation and retrieves a result after actual service-worker retirement. The
Port route uses the production service-worker prover registration, including
its request deadlines and offscreen acquisition/release behavior.

To exercise a built extension's real WASM worker, set `PROVER_E2E_ARTIFACT` to its
output directory and `PROVER_E2E_FIXTURE` to a synthetic fixture directory with
`meta.json` (`k`, `keyLocation`), `preimage.bin`, `circuit.prover`,
`circuit.verifier` and `circuit.bzkir`. This mode downloads public proving
parameters and uses neither a wallet nor funds. Playwright's Chromium must be
installed, or `PROVER_TEST_CHROME` must point to an extension-capable browser.
Match the manual-test browser executable when investigating version-specific
failures. To test increasing sizes in one session, provide comma-separated fixture
directories in `PROVER_E2E_FIXTURE` (for example `/fixtures/k15,/fixtures/k16`).
Set `PROVER_E2E_DURATION_MS` to allow enough time for the complete sequence.
Progress and per-fixture timings are printed without proof contents.

Also run `nx run lace-extension:test-extension-startup` with
`PROVER_E2E_ARTIFACT` set. This loads the complete monolith in a disposable profile,
checks synchronous install-listener registration and waits for onboarding on
both installation and restart. It uses a browser automation connection; the
separate prover runtime test supplies the evidence without a debugger. Backend
registration imported by the service-worker entry must remain free of runtime
SDK imports, whose asynchronous initialization can break Chrome's install phase.
Both browser targets run in CI whenever the extension dependency graph is affected;
startup tests consume that run's production build.
