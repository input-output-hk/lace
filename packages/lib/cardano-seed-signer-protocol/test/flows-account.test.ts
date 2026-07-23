import { describe, expect, it } from 'vitest';

import {
  accountDerivationPath,
  buildAccountRequest,
  parseAccountResponse,
} from '../src/flows/account';
import {
  PURPOSE_CIP1852,
  decodeCardanoAccountRequest,
  encodeCardanoAccountResponse,
} from '../src/messages/cardano-account';
import { CardanoUrType } from '../src/ur-types';
import {
  COIN_TYPE_ADA,
  DerivationPath,
  HARDENED_OFFSET,
} from '../src/value-objects/derivation-path.vo';
import { RequestId } from '../src/value-objects/request-id.vo';
import { Xfp } from '../src/value-objects/xfp.vo';

const requestId = RequestId('acct-1');

describe('buildAccountRequest', () => {
  it('builds a cardano-account-req that decodes back to the inputs', () => {
    const built = buildAccountRequest([0, 1], { requestId, origin: 'Lace' });
    expect(built.urType).toBe(CardanoUrType.AccountRequest);
    expect(decodeCardanoAccountRequest(built.cbor)).toEqual({
      requestId,
      accountIndices: [0, 1],
      keyPurpose: PURPOSE_CIP1852,
      origin: 'Lace',
    });
  });

  it('defaults keyPurpose to CIP-1852 and omits origin', () => {
    const built = buildAccountRequest([2], { requestId });
    expect(decodeCardanoAccountRequest(built.cbor)).toEqual({
      requestId,
      accountIndices: [2],
      keyPurpose: PURPOSE_CIP1852,
      origin: undefined,
    });
  });
});

describe('parseAccountResponse', () => {
  it('parses master fingerprint, keys, and device label', () => {
    const path = accountDerivationPath(0);
    const cbor = encodeCardanoAccountResponse({
      requestId,
      masterFingerprint: Xfp(new Uint8Array([1, 2, 3, 4])),
      keys: [{ accountIndex: 0, xpub: new Uint8Array(64).fill(7), path }],
      deviceLabel: 'Cardano SeedSigner',
    });
    expect(parseAccountResponse(cbor)).toEqual({
      requestId,
      masterFingerprint: Xfp(new Uint8Array([1, 2, 3, 4])),
      keys: [{ accountIndex: 0, xpub: new Uint8Array(64).fill(7), path }],
      deviceLabel: 'Cardano SeedSigner',
    });
  });
});

describe('accountDerivationPath', () => {
  it("builds m/1852'/1815'/account'", () => {
    expect(accountDerivationPath(3)).toEqual(
      DerivationPath([
        PURPOSE_CIP1852 + HARDENED_OFFSET,
        COIN_TYPE_ADA + HARDENED_OFFSET,
        3 + HARDENED_OFFSET,
      ]),
    );
  });

  it('rejects a negative account index', () => {
    expect(() => accountDerivationPath(-1)).toThrow(
      'account index out of range: -1',
    );
  });

  it('rejects a non-integer account index', () => {
    expect(() => accountDerivationPath(1.5)).toThrow(
      'account index out of range: 1.5',
    );
  });

  it('rejects an account index at or above 2^31', () => {
    expect(() => accountDerivationPath(HARDENED_OFFSET)).toThrow(
      'account index out of range',
    );
  });
});
