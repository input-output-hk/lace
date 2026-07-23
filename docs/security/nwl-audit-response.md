# Lace — response to the No Witness Labs security audits

Public disposition of every finding from the three independent security
audits Lace commissioned from No Witness Labs (NWL). For each finding we
state whether it is **fixed** or **accepted with a documented rationale**.

As of the date of this document, every finding is either resolved in the
current Lace codebase or accepted with a documented rationale. The signed
audit reports are published alongside this document. Fixes are referenced by
the **source file / symbol** that carries them — durable anchors that resolve
against this repository regardless of commit history — rather than internal
identifiers.

| Audit                                                   | Scope         | Findings |
| ------------------------------------------------------- | ------------- | -------- |
| 2025-11-19 — Browser Extension & API (Midnight Preview) | extension     | 15       |
| 2026-01-26 — Mobile App                                 | iOS / Android | 28       |
| 2026-02-27 — Browser Extension (re-audit)               | extension     | 7        |

> **On the audited applications.** The two browser-extension audits
> (2025-11-19 and 2026-02-27) were performed on the standalone **Midnight
> Preview** extension, which has since been retired. Its common modules were
> carried into the shipping **Lace** browser extension (`apps/lace-extension`,
> which now includes Midnight support), along with the remediations below —
> which are verified in `lace-extension` and its shared modules, not in the
> retired preview build.

**Disposition summary (50 findings):** fixed · accepted with rationale. No
accepted finding is a reachable path to loss of funds, private keys, or
recovery material — each acceptance is justified in the "Accepted with
rationale" section below.

> **A note on status.** The audit reports are point-in-time and record no
> vendor-verified "fixed" state; the statuses below are our own, established
> by source verification against the current codebase. Every finding shown as
> fixed is remediated in the code published alongside this document.

---

## Fixed

Each finding below is remediated in the current codebase; every fix is
anchored to the source file / symbol that carries it.

### Browser extension (Midnight Preview audits R1 / R2)

| Finding                                                | Fix                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-501 Unshielded private-key memory leak               | Midnight key buffers are zeroized after wallet build and on idle (`blockchain-midnight` account key manager).                                                                                                                                                                                                                                                       |
| M-302 / Mobile M-304 PBKDF2 iterations too low         | New wallet secrets are encrypted with an Argon2id key-derivation function at OWASP-aligned cost, replacing PBKDF2, in `SecretBox` key derivation (`packages/lib/core`); a legacy decrypt path is retained for existing wallets.                                                                                                                                     |
| M-301 XSS via token/NFT metadata image                 | Inline-SVG data URIs are refused at the image-render boundary (`getAssetImageUrl` in `packages/lib/ui-toolkit/.../image-format.ts`); the extension CSP sets `object-src 'none'` and a lint rule bans raw-HTML sinks. A normalizing proxy for remote images is a tracked follow-up.                                                                                  |
| M-304 Bundles exposed to every origin (narrowing)      | The content script no longer targets `file://` pages (extension manifest `content_scripts`); the all-origins http(s) injection itself is retained by design — see rationale.                                                                                                                                                                                        |
| M-305 Password / ZSwap key not zeroized                | The unlock password and decrypted ZSwap key are zeroized after use; the auth secret is accessed only through short-lived clones that are auto-zeroed after each use.                                                                                                                                                                                                |
| L-201 Unlimited password attempts                      | Consecutive failed unlock attempts are counted and persisted across restarts; on each failure the prompt locks the entry field and disables submit, showing a countdown until an exponential backoff (1s → 60s cap) elapses, reset on a successful unlock. Applied at both the extension and mobile unlock prompts (`authentication-prompt` slice + unlock prompt). |
| L-202 Weak password policy                             | Password creation is gated by a zxcvbn strength check (minimum score 3) in the onboarding password screen.                                                                                                                                                                                                                                                          |
| L-203 Feature-flag cache controllable via page storage | Feature flags are delivered to content scripts over an extension-controlled channel instead of page `localStorage`.                                                                                                                                                                                                                                                 |
| L-205 Missing CDDL/Bech32 address validation           | Address validation uses the SDK codec decoders (`midnight-context` address utilities), not regex.                                                                                                                                                                                                                                                                   |
| I-101 / Mobile M-302 Unsafe onboarding                 | Seed reveal is gated behind an explicit tap-to-reveal; clipboard copy of the seed is dev-only; a note states the password cannot be reset (only wallet restore); the show/hide toggle is removed from the password tab order (onboarding screens + `OnboardingDesktopLogin` template).                                                                              |
| I-102 Missing address book                             | A contacts / address-book feature (create/edit/delete) ships.                                                                                                                                                                                                                                                                                                       |
| I-103 Unimplemented wallet-API codecs                  | The dApp-connector codecs perform real validation instead of unchecked type casts.                                                                                                                                                                                                                                                                                  |
| R2 L-201 Plaintext secrets in Redux                    | Onboarding/restore secrets were moved out of the observable store into a short-lived in-memory buffer, off the action log and selectors (onboarding / account-management slices).                                                                                                                                                                                   |
| R2 L-202 Recovery phrase not zeroized                  | The decrypted mnemonic is a byte array that is zeroized after use (`recovery-phrase` channel).                                                                                                                                                                                                                                                                      |
| R2 L-204 Shared provider credentials                   | Blockfrost is moved behind the IOG proxy fleet (as every other provider already is), removing the client-side key; the same proxying is extended to the mobile client (Cardano provider configuration).                                                                                                                                                             |

### Mobile

| Finding                                              | Fix                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-501 Authentication bypass (UI-gated secret)        | Secret access is enforced at the secret-access boundary (hardware-backed OS authentication), not only in the UI.                                                                                                                                                                                                                                                                                          |
| H-401 Encrypted seed in unprotected storage          | The password is stored hardware-backed with OS authentication; the seed/keys are not persisted.                                                                                                                                                                                                                                                                                                           |
| H-402 / H-405 Android auto-backup                    | `allowBackup` is disabled (`apps/lace-mobile/app.json`).                                                                                                                                                                                                                                                                                                                                                  |
| H-403 Dev/test feature flags in prod defaults        | Production feature-flag defaults contain no dev/test flags.                                                                                                                                                                                                                                                                                                                                               |
| H-404 Android build injects `mavenLocal()`           | Android AARs/POMs resolve from Maven Central; no local vendoring.                                                                                                                                                                                                                                                                                                                                         |
| M-307 Number/BigInt mixing in input selection        | The mixed-type comparison in Bitcoin coin-selection was removed.                                                                                                                                                                                                                                                                                                                                          |
| M-308 iOS podspec fetched without a content checksum | The iOS Apollo `xcframework` is fetched through a vendored podspec that pins a `:sha256` of the artifact, so CocoaPods verifies the download before linking — matching Android, which already resolves the same library via a checksummed Maven coordinate. A regeneration script recomputes the digest on each version bump (`apps/lace-mobile/apollo-ios/ApolloLibrary.podspec` + `expo-build-plugin`). |
| M-309 Sentry debug mode / full sampling              | Sentry runs with `debug` off and reduced trace/profile sampling in production.                                                                                                                                                                                                                                                                                                                            |
| L-203 Vulnerable npm dependencies                    | The advisories `npm audit` flags in the mobile workspace are not reachable in the shipped app (the affected packages are superseded by the Apollo crypto path); production-reachable advisories elsewhere are pinned via dependency overrides.                                                                                                                                                            |
| L-204 `rawToBigInt` precision loss                   | Integer parsing constructs the `BigInt` directly instead of routing through a float, preventing precision loss above 2⁵³ (`format-number.ts` in `packages/lib/util-render`).                                                                                                                                                                                                                              |
| L-206 iOS export-compliance declaration              | `ITSAppUsesNonExemptEncryption` is declared (`apps/lace-mobile/app.json`).                                                                                                                                                                                                                                                                                                                                |
| L-207 Dev artifacts in release builds                | The dev-only test module is gated out of release builds (mobile module registration).                                                                                                                                                                                                                                                                                                                     |
| L-208 Feature-flag override in prod builds           | The override is a build-time mechanism only; no runtime override ships.                                                                                                                                                                                                                                                                                                                                   |
| I-101 Native Apollo sync-API inconsistency           | The unused, signature-drifted synchronous native bridge declarations were removed (`packages/module/crypto-apollo`).                                                                                                                                                                                                                                                                                      |
| I-102 Non-functional address book                    | The mobile contacts feature is implemented.                                                                                                                                                                                                                                                                                                                                                               |
| I-105 Sensitive material via logger                  | Log payloads pass through recursive redaction before serialization (`ObservableLogger`).                                                                                                                                                                                                                                                                                                                  |
| L-205 Provider API keys bundled in the client        | No provider API key is bundled on mobile: Maestro routes through the IOG proxy (`maestro.lw.iog.io`, no key) and Blockfrost is moved behind it (the R2 L-204 proxy work, extended to mobile). The only remaining `EXPO_PUBLIC_*` values are the PostHog ingest token and Sentry DSN — public-by-design telemetry identifiers, not provider credentials.                                                   |

---

## Accepted with rationale

Each finding below is accepted rather than code-remediated. Every acceptance
was independently reviewed by a security engineer against the current `main`
source (not the point-in-time audited commit), grounded in specific code.
**No accepted finding was assessed as a reachable path to loss of funds, keys,
or recovery material.** Accepts are of two kinds: **Accept** (a standing
decision) and **Defer** (accepted with a committed follow-up).

> **Note on provider credentials.** NWL grouped two provider-credential
> findings; both are resolved by proxying (see Fixed above). **R2 L-204
> (extension)** was moved out of acceptance to a fix — every provider except
> Blockfrost already routes through IOG's proxy fleet, so Blockfrost is brought
> in line, and the same proxying is extended to mobile. **Mobile L-205
> (mobile)** resolves the same way: Maestro already routes through the IOG
> proxy and Blockfrost is brought in line, so no provider API key is bundled on
> mobile. The only `EXPO_PUBLIC_*` values that remain are public-by-design
> telemetry identifiers (the PostHog ingest token and Sentry DSN), which carry
> no provider or data authority.

### A. Cryptographic & numeric correctness

#### Mobile M-306 — Bitcoin satoshi calculations use JavaScript `number` (Medium) · Accept

Bitcoin amounts are represented as JavaScript `number`, which is safe by
construction: the entire Bitcoin supply (~2.1 × 10¹⁵ satoshis) is more than
four times smaller than the largest integer JavaScript represents exactly
(~9.0 × 10¹⁵), so every balance, input, output, and sum is exact. Lace
performs no satoshi × satoshi multiplication (the only products are
transaction byte-size × fee-rate, which are small), and the one place values
are aggregated across a whole wallet — the balance calculation — is already
computed in arbitrary-precision `BigInt`. At signing, the underlying library
(`bitcoinjs-lib` v6) itself requires `number`-typed values, so a `BigInt`
migration would be reversed at that boundary and add conversion surface
without removing any reachable risk. The NWL report itself notes a single
balance cannot exceed the safe-integer limit. **Re-open:** upgrading to
`bitcoinjs-lib` v7+ (which adopts `BigInt`), or introducing any amount ×
amount computation.

### B. Dependency & supply-chain posture

#### R2 I-103 — Vulnerable `elliptic` in transitive dependencies (Informational) · Accept

`elliptic@6.6.1` enters the tree only as a deep transitive dependency of the
**hardware-wallet connector stack** — `@trezor/connect` (via
`@trezor/utxo-lib`→`tiny-secp256k1` and `@trezor/blockchain-link`→
`crypto-browserify`) and `@keystonehq/*` (via `secp256k1`'s pure-JS browser
fallback) — plus a build-time crypto polyfill. No first-party Lace code imports
it, and Lace's own cryptography does not use it: Cardano signing is Ed25519
executed on the hardware device, and Bitcoin signing uses
`@noble`/`@bitcoinerlab/secp256k1`. The advisory (CVE-2025-14505) affects every
published `elliptic` version, has no patch, and `elliptic` is effectively
end-of-life — no release since November 2024 and the upstream issue is open with
no maintainer response. Upgrading does not help: we verified that even the latest
`@trezor/connect` still bundles `elliptic` through `tiny-secp256k1@1.x` and
`crypto-browserify`, so no version bump — and no safe dependency override —
removes it short of the hardware-wallet SDKs migrating off `elliptic` upstream,
or dropping hardware-wallet support entirely. That migration is active, not
abandoned: Trezor tracks it in `trezor/trezor-suite#26791`, covering the same
`tiny-secp256k1` and `crypto-browserify` chains, with `@noble/curves` as the
replacement — it has simply not yet shipped in a released `@trezor/connect`. The
flaw is a truncated-nonce risk in `elliptic`'s ECDSA _signing_, and Lace never
signs through it, so it does not sit on any Lace key-handling path. **Re-open:**
the upstream migration landing in a released `@trezor/connect` (or a patched
`elliptic`), a new advisory that is remotely reachable or key-compromising, or
any first-party code depending on `elliptic`.

#### R1 M-303 — Critical dependencies use floating semver ranges (Medium) · Accept

Application manifests use caret/tilde ranges, but installs are not driven by
those ranges. Every build — CI and release — runs `npm ci`, installing
exclusively from the committed `package-lock.json` and verifying each package
against its recorded integrity hash. A dedicated `lockfile-check` CI job
regenerates the lockfile on every pull request and fails if it differs from the
committed file, so any change to a resolved dependency (including transitive
drift or a re-published tarball) must be committed and reviewed before it can
ship. The lockfile, not the semver range, is the reviewed source of truth. **Re-open:** removal/weakening
of the `lockfile-check` gate, or any build path moving off `npm ci`.

#### Mobile M-305 — Vulnerable dev dependencies (Medium) · Accept

The advisories `npm audit` flags are confined to development, build, and
end-to-end-test tooling (nx, jest, metro, appium, WebdriverIO/BrowserStack,
Electron debug UIs, the internal release tool). Each was confirmed absent from
both apps' production dependency closure by an explicit breadth-first
reachability analysis — not a blanket "dev dependency" assumption: the same
audit cycle reclassified and fixed packages (`axios`, `ua-parser-js`, `undici`,
`uuid`) the moment reachability analysis showed them in the shipped runtime.
Where a dev advisory has a semver-compatible fix we take it rather than accept
it: `websocket-driver` (critical), `path-to-regexp` (high), `yaml`, `morgan`,
and the `uuid` 13.x line are pinned to patched versions through the root
`package.json` `overrides` block, which clears the audit's only critical. What
remains accepted is the residual with no compatible fix — advisories that would
require a breaking major upgrade of test tooling (`electron`, the `got` copy
`react-devtools` pulls in, `@wdio/browserstack-service`, `@grpc/grpc-js`) or
that have no published fix at all. Because none of this code is emitted into the
shipped app bundle, the advisories are not reachable by an end user; the
residual is a build-toolchain concern mitigated by pinned `npm ci` installs from
the reviewed lockfile. **Re-open:** any of these packages entering the
production closure (re-checked each prod-closure audit), or a new critical
advisory in an actively-run build tool.

### C. Session & local-device access

#### R1 L-204 / R2 I-101 — No auto-lock / no authentication to open the extension (Low / Informational) · Accept

Lace does provide auto-lock — the mobile app auto-locks after 5 minutes, and the
browser extension offers a configurable 1–60 minute idle timeout in Settings.
The accepted point is narrower: on the **extension**, auto-lock is **off by
default**. That default is deliberate and **does not expose funds or secret
material**. Every
action that can move value or reveal secrets — signing any transaction, signing
data, authorizing a connected dApp, exporting the recovery phrase, and adding
or removing wallets/accounts — is independently gated behind a password (or
biometric) re-authentication enforced in the signing layer itself, on every
attempt, with no session bypass. An attacker with physical access to an
unlocked, unattended session can therefore **view** account information
(balances, addresses, history) but cannot transfer funds or extract keys or the
recovery phrase. We treat the residual as a **confidentiality** consideration
for shared/unattended devices and mitigate it with a user-configurable
auto-lock and manual lock; users on shared machines are advised to enable the
idle timeout. **Re-open:** any signing/export/account-mutation path reachable
without a preceding re-authentication, or the introduction of a session-level
"skip re-auth" cache.

#### Mobile L-202 — Wallet renaming without re-authentication (Low) · Accept

Renaming an account changes only a local display label. It moves no funds,
touches no keys or recovery material, and produces no on-chain effect; the
change is stored as account metadata and is fully reversible by the user.
Because the operation carries no security-sensitive capability, gating it
behind re-authentication would add friction without reducing risk;
re-authentication is reserved for actions that can move value or expose
secrets. Reserving it that way also keeps the unlock secret's exposure surface
minimal — every feature that requires the secret is another place it could leak
or be abused, so it should not be entered for actions that carry no
security-sensitive capability. **Re-open:** only if account metadata is extended
to carry a
security-relevant field (e.g. anything consumed by the signing or derivation
path).

#### Mobile M-303 — No root / jailbreak detection (Medium) · Accept

A rooted or jailbroken device sits outside the wallet's trust boundary: the OS
sandbox, keystore, and secure-enclave guarantees Lace depends on are the very
properties root/jailbreak removes. Once those are gone an attacker with local
privilege can attach a runtime instrumentation framework, read process memory,
and dump storage regardless of any in-app check — and the check itself is
client-side and routinely bypassed on exactly the devices it aims to catch
(Magisk/Zygisk hiding, Frida, jailbreak-detection-bypass tweaks).
Detect-and-warn would therefore give a false sense of assurance without closing
the exposure. Consistent with common non-custodial-wallet posture, we treat
device integrity as the platform's responsibility and keep the hardware-backed
keystore/enclave as the security boundary. **Re-open:** if a detect-and-warn
advisory is wanted purely as user guidance (not a control), or if attestation
primitives (Play Integrity / DeviceCheck + App Attest) are adopted as a gate
for a specific high-value flow.

#### Mobile M-301 — No screenshot / recording prevention on sensitive screens (Medium) · Accept

Marking screens that show the recovery phrase or password as secure
(`FLAG_SECURE` / `expo-screen-capture`) blocks the OS screenshot and
screen-recording paths, but not the threat they stand in for: an observer able
to view a sensitive screen can photograph it with a second device, and on a
compromised device the OS-level flag is itself bypassable — so the control
offers partial assurance at a real usability cost (it also breaks legitimate
screenshots and screen-sharing during support). It carries no authority over
funds or keys: the recovery phrase is shown only behind authentication and an
explicit tap-to-reveal, and the hardware-backed keystore/enclave remains the
security boundary. This is the same posture as root/jailbreak detection —
device- and observer-side risks the wallet cannot meaningfully close from
inside the app. **Re-open:** if screenshot suppression is wanted specifically
as guidance on the seed-reveal screen (accepting the UX cost there), or if a
defined platform threat model makes it a requirement.

### D. Key memory hygiene

#### R2 L-203 — Dust secret key not cleared on idle/lock, Midnight accounts (Low) · Defer

On wallet lock/idle, Lace zeroizes the Midnight Night and Zswap (shielded)
private-key material from memory — the shielded keys are cleared on idle and
re-derived on demand through the wallet's deferred-sync path. The Dust key is
retained because the Dust wallet cannot be stopped once started without
corrupting shared wallet state, and an equivalent deferred path for it requires
a filtered dust-wallet indexer interface that Lace does not yet consume; until
it lands, clearing the key while the Dust wallet runs would break Dust signing
without removing the copy the running wallet already holds. Reaching the retained key requires an attacker
to already have live access to the extension's process memory — a prior host- or
extension-level compromise, outside the threat model idle-clearing defends — and
the exposure is limited to Dust (a fee resource), not shielded funds. This is a
tracked follow-up: once the filtered dust-wallet indexer is available, the Dust
wallet will be stopped on lock and its key zeroized and re-derived on unlock,
matching the shielded keys. **Re-open:** any change that lets the retained Dust
key be reached without a prior process-memory compromise, or that extends its
exposure beyond the Dust fee resource.

### E. Network & privacy

#### Mobile L-201 — No SSL/certificate pinning (Low) · Accept

Lace relies on the operating-system TLS stack with HTTPS enforced on all
traffic; cleartext connections are disabled by platform policy on both Android
(target SDK ≥ 28) and iOS (App Transport Security, no `NSAllowsArbitraryLoads`).
Certificate pinning would add protection only where an attacker already
controls a certificate authority trusted by the device — a scenario that
generally implies the device's trust store is already compromised. Against that
narrow gain, pinning introduces a material availability risk: routine
certificate/CA rotation can render the app unusable for all users until an
update ships, and it demands a standing rotation process. Consistent with
common practice among non-custodial wallets, we do not pin; no fund-authorizing
or session-bearer credential traverses the network (signing is on-device; the
unlock secret never leaves the device). **Re-open:** introduction of any
fund-authorizing or session-bearer API over the network (revisit with a
remote-config kill-switch to manage rotation risk).

#### R1 I-104 — TOR network anonymity (Informational, suggestion) · Accept (decline)

Network-level anonymity (routing provider requests over TOR) is an optional
enhancement, not a defect. Because Lace queries blockchain indexers directly, a
network observer or the provider can associate a user's IP with the addresses
they query — a metadata exposure that does not affect the security of funds or
keys. Integrating an anonymity network into a consumer wallet imposes
substantial latency, reliability, and usability costs and lies outside the
wallet's core threat model; users who require it can run Lace behind their own
VPN or Tor. We are declining built-in TOR support and will disclose in the
privacy notice that provider requests originate from the user's IP and that
providers can observe queried addresses. **Re-open:** network-level
deanonymization becoming a defined product requirement.

### F. Extension attack surface

#### R1 M-304 — Extension exposes its bundles to every origin (Medium) · Accept (with a narrowing)

The extension injects a dApp-connector content script on all HTTP(S) pages by
design (ADR 21). This is the standard wallet-extension model: a connector API
must be present before a dApp's page scripts run, and any page may be a dApp.
Consulting feature flags per page to decide injection would require waking the
background service worker on every page visit — a resource cost we deliberately
avoid. Injection is inert until used: the content-script channels connect
lazily and only open a service-worker connection when a dApp actually calls an
injected API. Critically, the injected surface carries **no authority over
funds** — it holds no key material and can only forward requests the service
worker gates behind explicit in-app user authentication; the user secret never
enters the content-script context. The residual is limited to
extension-presence fingerprinting and generic web-phishing UI, neither specific
to Lace nor a path to wallet compromise. As a surface-minimization measure we
are narrowing the `file://` content-script match (dApps are never served from
`file://`, and browsers do not inject there by default). **Re-open:** any
change that lets a content script access key material or sign without in-app
confirmation, or that broadens `web_accessible_resources` beyond bundle chunks.

#### Mobile I-104 — Transaction/wallet transfer via QR and file import (Informational) · Accept

Lace has no untrusted file-import path: it ships no document- or image-picker
and never reconstructs a wallet or transaction from a file on disk. The two QR
ingestion paths are validated, not free-form imports. The send-flow scanner
only pre-fills a recipient address, which the per-blockchain address validator
checks and which the user reviews and signs before any funds move — a malformed
value is rejected and no scan can bypass signing. The air-gapped scanner
accepts only responses whose UR type matches the exchange it initiated
(enforced independently in both the background side-effect and the on-screen
overlay), and the payload is a hardware-signer signature over a transaction
Lace constructed itself; a substituted or malformed QR is dropped at the type
gate, rejected at CBOR decode, or fails signature verification — it cannot
alter the transaction being submitted. **Re-open:** any file/image import that
deserializes wallet or transaction data, or any QR payload that can carry a
complete transaction or seed bypassing the in-app builder and signing flow.

### G. Content trust

#### R2 I-102 — No spam-token detection or filtering (Informational) · Defer

Lace displays all Cardano native tokens and NFTs a wallet receives, including
unsolicited airdrops, and does not yet distinguish "verified" from "unverified"
assets or check them against a registry or blocklist. We classified the
security impact as informational: the threat is **user deception** (a token
mimicking a legitimate project's name/logo, or a phishing link in metadata),
not compromise of funds or keys — a spam token cannot move assets, trigger
signing, or act on the user's behalf. We verified that this untrusted metadata
never reaches a code-execution or automatic-navigation path: URLs in token/NFT
metadata are rendered as inert, non-clickable text (no in-app tappable link to
an attacker site), metadata is stringified rather than interpreted as markup,
and images are rendered through the raster image pipeline rather than any HTML
or script-capable context. Displayed amounts/decimals are read from chain, so a
spam token's balance is mathematically accurate rather than attacker-controlled,
and any harm requires the user to act on the deceptive content outside the
wallet. A robust remediation — a Cardano token-registry integration with
verification badges and spam classification — is a substantial,
security-sensitive feature best delivered scoped and reviewed; it is committed
as a tracked fast-follow. **Re-open:** any change that makes token-metadata URLs
clickable, renders metadata in an HTML/WebView context, or otherwise creates a
navigation or execution sink from untrusted asset metadata.
