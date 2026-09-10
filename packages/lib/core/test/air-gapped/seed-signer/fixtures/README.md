# Golden fixtures: Cardano SeedSigner companion evidence

`companion-evidence.json` is the wire-format source of truth for the golden
tests in `../golden.test.ts`. Every CBOR byte string in it was produced by the
**reference Python Cardano SeedSigner companion + simulated device**, never by
re-encoding with this TypeScript library. The golden tests then prove the TS
builders produce byte-identical request CBOR and the TS parsers decode the
device responses to the exact values the device emitted, so the two
implementations can never drift on the wire.

## What is captured

Generated from the known BIP-39 abandon mnemonic
(`abandon abandon ... about`) on the testnet, fully offline (no Blockfrost, no
hardware, no network):

- **account export** - `cardano-account-req` request + `cardano-account`
  response (master fingerprint `73c5da0a`, account 0 xpub).
- **CIP-8 message signing** for the `payment`, `stake`, and `drep` credentials -
  each a `cardano-cip8-sig-req` request + `cardano-cip8-sig-res` response
  (COSE_Sign1 + COSE_Key) for the message `"Hello, Cardano!"`.
- **transaction signing** - `cardano-tx-sig-req` request + `cardano-tx-sig-res`
  response (tag-258 vkey witness set) for a minimal static tx body with a single
  wallet-owned payment input. This mirrors
  `examples/test_companion.py::test_tx_signing_through_simulator`, so no
  Blockfrost project id is needed.

Each entry stores the exact builder inputs (request id, origin, payload, signing
path, address bytes, xfp, network) alongside `request_cbor` / `response_cbor`
(hex) and the decoded fields. Fixed request ids
(`00000000-0000-0000-0000-00000000000{1,2,3}`) are used instead of random UUIDs
so the request bytes are deterministic and reproducible. Ed25519 / CIP-8
signing is deterministic (RFC 8032), so the response bytes are stable across
runs too -- regenerating yields an identical file.

## Regeneration

Requires Python 3.12 (cometa ships no 3.14 wheel yet) and a checkout of the
reference repo at `../../angel/cardano-seedsigner` relative to this repo.

```sh
# 1. Create a venv and install the companion + device dependencies.
python3.12 -m venv /tmp/seedsigner-venv
/tmp/seedsigner-venv/bin/pip install --upgrade pip
/tmp/seedsigner-venv/bin/pip install biglup-cometa cbor2 embit==0.8.0 urtypes==1.0.1

# 2. Regenerate the fixture from the reference companion + simulated device.
SEEDSIGNER_REPO=/absolute/path/to/cardano-seedsigner \
  /tmp/seedsigner-venv/bin/python generate-evidence.py > companion-evidence.json
```

`generate-evidence.py` (committed beside the fixture) imports the device's own
codecs (`seedsigner.models.cardano_account` / `cardano_tx`) and runs the
in-process `SimulatedDevice` from `examples/companion`, exactly as the
companion's `examples/*_e2e.py` scripts do. `embit` and `urtypes` are firmware
deps the simulator pulls in; the hardware-only QR deps
(`opencv-python` / `pyzbar` / `qrcode`) are not needed for `--simulator`.

After regenerating, run the golden tests:

```sh
npx nx test @lace-lib/cardano-seed-signer-protocol
```
