/**
 * The device commitment and public key vectors below come from the
 * reference Account Custody Contract client (the passport contract
 * repository, src/wallet/signer.ts) over the same fixed scalar, address,
 * epoch, and counter.
 */
import { AccAddress, DeviceEpoch, UseCounter } from '@lace-contract/passport';
import { HexBytes } from '@lace-lib/util';
import { describe, expect, it } from 'vitest';

import { UnknownCircuitError } from '../../src/acc/artefact-loader';
import { jubjubChallenges } from '../../src/acc/challenges';
import { devJubjubAuthoriser } from '../../src/acc/dev-authoriser';
import { bytesToBigIntLE, JUBJUB_R } from '../../src/acc/signer';

import type { AuthorisationRequest } from '@lace-contract/passport';

const SK = BigInt(
  '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
);
const EXPECTED_PK_X = BigInt(
  '0x09b5a8331d01ee2bae5f0a79aeb181cbf0d0c30624e91b168f92a1ee141f1eb5',
);
const EXPECTED_PK_Y = BigInt(
  '0x04cace00c5ac40ee25037dac862ee498605d93ff626ac4930edb43ef08d575c5',
);
const EXPECTED_ENTRY =
  '73b71bbbedfc07c5a859cc3c48e64fef1182818d19527ebf314e7194b2d4a1a8';

const CONTRACT_ADDRESS = Uint8Array.from(
  { length: 32 },
  (_, index) => index + 1,
);
const ACCOUNT = AccAddress(HexBytes.fromByteArray(CONTRACT_ADDRESS));
const NEW_ENTRY = new Uint8Array(32).fill(0x5a);

const addDeviceRequest: AuthorisationRequest = {
  account: ACCOUNT,
  circuit: 'add_device_with_jubjub',
  args: [NEW_ENTRY],
  witnessValues: [],
  authNonce: 7n,
  useCounter: UseCounter(3n),
};

describe('devJubjubAuthoriser', () => {
  const authoriser = devJubjubAuthoriser(SK);

  it('implements the jubjub-schnorr scheme', () => {
    expect(authoriser.scheme).toBe('jubjub-schnorr');
  });

  it('exposes the reference public key for the fixed scalar', async () => {
    await expect(authoriser.devicePublicKey()).resolves.toEqual({
      x: EXPECTED_PK_X,
      y: EXPECTED_PK_Y,
    });
  });

  it('derives the reference device commitment', async () => {
    await expect(
      authoriser.deviceCommitment(ACCOUNT, DeviceEpoch(0n), UseCounter(0n)),
    ).resolves.toBe(EXPECTED_ENTRY);
  });

  it('computes batched commitments equal to per-counter calls', async () => {
    const counters = [UseCounter(0n), UseCounter(1n), UseCounter(2n)];

    const batch = await authoriser.deviceCommitments!(
      ACCOUNT,
      DeviceEpoch(0n),
      counters,
    );
    const perCall = await Promise.all(
      counters.map(async counter =>
        authoriser.deviceCommitment(ACCOUNT, DeviceEpoch(0n), counter),
      ),
    );

    expect(batch).toEqual(perCall);
    expect(batch[0]).toBe(EXPECTED_ENTRY);
  });

  it('authorises an addDevice call with a verifiable challenge', async () => {
    const authorisation = await authoriser.authorise(addDeviceRequest);

    expect(authorisation.scheme).toBe('jubjub-schnorr');
    expect(authorisation.pk).toEqual({ x: EXPECTED_PK_X, y: EXPECTED_PK_Y });
    expect(authorisation.useCounter).toBe(3n);
    expect(authorisation.sigS).toBeLessThan(JUBJUB_R);

    const builder = jubjubChallenges.addDevice(
      { contractAddress: CONTRACT_ADDRESS, authNonce: 7n },
      authorisation.pk,
      NEW_ENTRY,
    );
    expect(
      bytesToBigIntLE(builder(authorisation.sigR, authorisation.grindNonce)),
    ).toBeLessThan(JUBJUB_R);
    for (let nonce = 0n; nonce < authorisation.grindNonce; nonce++) {
      expect(
        bytesToBigIntLE(builder(authorisation.sigR, nonce)),
      ).toBeGreaterThanOrEqual(JUBJUB_R);
    }
  });

  it('authorises a removeDevice call against its own challenge builder', async () => {
    const entry = Uint8Array.from(Buffer.from(EXPECTED_ENTRY, 'hex'));
    const authorisation = await authoriser.authorise({
      ...addDeviceRequest,
      circuit: 'remove_device_with_jubjub',
      args: [entry],
    });

    const builder = jubjubChallenges.removeDevice(
      { contractAddress: CONTRACT_ADDRESS, authNonce: 7n },
      authorisation.pk,
      entry,
    );
    expect(
      bytesToBigIntLE(builder(authorisation.sigR, authorisation.grindNonce)),
    ).toBeLessThan(JUBJUB_R);
  });

  it('rejects circuits without a challenge builder', async () => {
    for (const circuit of [
      'activate_initial_device_with_jubjub',
      'withdraw_unshielded_with_jubjub',
    ]) {
      await expect(
        authoriser.authorise({ ...addDeviceRequest, circuit }),
      ).rejects.toThrow(UnknownCircuitError);
    }
  });

  it('rejects a request whose first argument is not a byte array', async () => {
    await expect(
      authoriser.authorise({ ...addDeviceRequest, args: ['5a5a'] }),
    ).rejects.toThrow(/byte-array entry/);
  });

  it('rejects an account address that is not lowercase hex bytes', async () => {
    await expect(
      authoriser.deviceCommitment(
        AccAddress('not-hex'),
        DeviceEpoch(0n),
        UseCounter(0n),
      ),
    ).rejects.toThrow(/lowercase hex/);
  });

  it('generates a working device when no scalar is given', async () => {
    const generated = devJubjubAuthoriser();
    const commitment = await generated.deviceCommitment(
      ACCOUNT,
      DeviceEpoch(0n),
      UseCounter(0n),
    );

    expect(commitment).toMatch(/^[0-9a-f]{64}$/);
    expect(commitment).not.toBe(EXPECTED_ENTRY);
  });
});
