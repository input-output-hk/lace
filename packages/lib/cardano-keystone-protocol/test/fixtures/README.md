# Golden fixtures: Keystone official stack evidence

`keystone-evidence.json` is the wire-format source of truth for the golden
tests in `../golden.test.ts`. Every request CBOR byte string in it was
produced by the **official @keystonehq/keystone-sdk**, and every response
CBOR byte string by the **official Keystone BC-UR registry classes**
(`CryptoMultiAccounts`, `CardanoSignature`, `CardanoSignDataSignature`),
never by re-encoding with this TypeScript library. The golden tests then
prove this library's builders produce byte-identical request CBOR and its
parsers decode the responses to the exact values the official stack emits,
so the two implementations cannot drift on the wire.

The golden tests additionally re-generate every request with the live SDK
and re-parse every response with it at test time, so a dependency upgrade
that changes the wire format is caught immediately even without
regenerating the fixture.

## What is captured

All values are deterministic. The master fingerprint `73c5da0a` and account
0 xpub belong to the well-known BIP-39 abandon mnemonic
(`abandon abandon ... about`); fixed request ids are used instead of random
UUIDs so the request bytes are reproducible.

- **account export** - a `qr-hardware-call` key derivation request for
  accounts 0 and 1 (`m/1852'/1815'/N'`, ed25519 / bip32ed25519, chain type
  `ADA`) + a `crypto-multi-accounts` response carrying the account 0 key.
- **transaction signing** - a `cardano-sign-request` for a minimal unsigned
  transaction with one wallet-owned input and one extra (stake) signer + a
  `cardano-signature` response carrying a single-witness vkey witness set.
- **transaction hash signing** - a `cardano-sign-tx-hash-request` for the
  same transaction, carrying its transaction id (the blake2b-256 hash of the
  body), the owned signer keypaths, and the owned input address. The response
  is the raw witness set CBOR itself: for hash signing the device replies
  with the `cardano-signature` UR type but the body is not a registry item
  and carries no request id echo.
- **CIP-8 data signing** - a `cardano-sign-data-request` for the
  Sig_structure of the message `"Hello, Cardano!"`, carrying the 32-byte
  raw public key of the signing key at the requested path
  (`m/1852'/1815'/0'/0/0`, soft-derived from the account 0 xpub), + a
  `cardano-sign-data-signature` response.

Each entry stores the exact builder inputs alongside `request_cbor` /
`response_cbor` (hex) and the decoded fields the parsers must produce.

## Regeneration

Regenerate with a Node script that calls the same official APIs the golden
tests use, from the repository root:

- requests: `new KeystoneSDK().generateKeyDerivationCall(...)`,
  `sdk.cardano.generateSignRequest(...)`,
  `sdk.cardano.generateSignTxHashRequest(...)`,
  `sdk.cardano.generateSignDataRequest(...)`
- responses: `new CryptoMultiAccounts(...)`, `new CardanoSignature(...)`,
  `new CardanoSignDataSignature(...)` from
  `@keystonehq/bc-ur-registry` / `@keystonehq/bc-ur-registry-cardano`,
  serialised with `toCBOR()`

using the inputs stored in the fixture itself. After regenerating, run:

```sh
npx nx test @lace-lib/cardano-keystone-protocol
```
