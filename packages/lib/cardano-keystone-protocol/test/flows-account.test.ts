import { Buffer } from 'buffer';

import {
  CryptoHDKey,
  CryptoKeypath,
  CryptoMultiAccounts,
  Curve,
  DerivationAlgorithm,
  QRHardwareCall,
} from '@keystonehq/bc-ur-registry';
import { describe, expect, it } from 'vitest';

import {
  FingerprintMismatchError,
  InvalidAccountPathError,
  KeystoneProtocolError,
  MissingProtocolFieldError,
  UnexpectedUrTypeError,
} from '../src/errors';
import {
  ADA_CHAIN_TYPE,
  accountDerivationPath,
  buildAccountRequest,
  parseAccountResponse,
} from '../src/flows/account';
import { toKeypath } from '../src/flows/registry-helpers';
import { KeystoneUrType } from '../src/ur-types';
import {
  COIN_TYPE_ADA,
  DerivationPath,
  HARDENED_OFFSET,
  PURPOSE_CIP1852,
} from '../src/value-objects/derivation-path.vo';
import { Xfp } from '../src/value-objects/xfp.vo';

import type { KeyDerivation } from '@keystonehq/bc-ur-registry';
import type { UrResult } from '@lace-lib/ur-transport';

const masterFingerprint = Xfp.fromHex('73c5da0a');
const publicKey = Buffer.alloc(32, 7);
const chainCode = Buffer.alloc(32, 9);

interface AccountHdKeyOverrides {
  path?: DerivationPath;
  sourceFingerprint?: Buffer;
  key?: Buffer;
  code?: Buffer;
  withOrigin?: boolean;
  withChainCode?: boolean;
}

const accountHdKey = ({
  path = accountDerivationPath(0),
  sourceFingerprint = Buffer.from(masterFingerprint),
  key = publicKey,
  code = chainCode,
  withOrigin = true,
  withChainCode = true,
}: AccountHdKeyOverrides = {}): CryptoHDKey =>
  new CryptoHDKey({
    isMaster: false,
    key,
    chainCode: withChainCode ? code : undefined,
    origin: withOrigin
      ? new CryptoKeypath(
          toKeypath(path).getComponents(),
          sourceFingerprint,
          path.length,
        )
      : undefined,
    name: 'Keystone',
  });

const accountResponse = (
  keys: CryptoHDKey[],
  fingerprint: Buffer = Buffer.from(masterFingerprint),
): UrResult => ({
  urType: KeystoneUrType.AccountResponse,
  cbor: Uint8Array.from(
    new CryptoMultiAccounts(
      fingerprint,
      keys,
      'Keystone 3 Pro',
    ).toCBOR() as Uint8Array,
  ),
});

describe('buildAccountRequest', () => {
  it('builds a qr-hardware-call that decodes back to the requested schemas', () => {
    const built = buildAccountRequest({
      accountIndexes: [0, 1],
      origin: 'Lace',
    });
    expect(built.urType).toBe(KeystoneUrType.AccountRequest);
    const call = QRHardwareCall.fromCBOR(Buffer.from(built.cbor));
    expect(call.getOrigin()).toBe('Lace');
    const schemas = (call.getParams() as KeyDerivation).getSchemas();
    expect(schemas).toHaveLength(2);
    schemas.forEach((schema, accountIndex) => {
      expect(schema.getCurve()).toBe(Curve.ed25519);
      expect(schema.getAlgo()).toBe(DerivationAlgorithm.bip32ed25519);
      expect(schema.getChainType()).toBe(ADA_CHAIN_TYPE);
      expect(schema.getKeypath().getPath()).toBe(
        `1852'/1815'/${accountIndex}'`,
      );
    });
  });

  it('omits the origin when not provided', () => {
    const built = buildAccountRequest({ accountIndexes: [0] });
    expect(
      QRHardwareCall.fromCBOR(Buffer.from(built.cbor)).getOrigin(),
    ).toBeUndefined();
  });

  it('rejects an empty account index list', () => {
    expect(() => buildAccountRequest({ accountIndexes: [] })).toThrow(
      'at least one account index is required',
    );
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

describe('parseAccountResponse', () => {
  it('parses master fingerprint, device, and account keys', () => {
    const parsed = parseAccountResponse(accountResponse([accountHdKey()]));
    expect(Xfp.toHex(parsed.masterFingerprint)).toBe('73c5da0a');
    expect(parsed.device).toBe('Keystone 3 Pro');
    expect(parsed.accounts).toHaveLength(1);
    const [account] = parsed.accounts;
    expect(account.accountIndex).toBe(0);
    expect([...account.path]).toEqual([...accountDerivationPath(0)]);
    expect(Buffer.from(account.publicKey)).toEqual(publicKey);
    expect(Buffer.from(account.chainCode)).toEqual(chainCode);
    expect(Buffer.from(account.extendedPublicKey)).toEqual(
      Buffer.concat([publicKey, chainCode]),
    );
  });

  it('rejects an unexpected UR type', () => {
    expect(() =>
      parseAccountResponse({ urType: 'crypto-psbt', cbor: new Uint8Array(0) }),
    ).toThrow(UnexpectedUrTypeError);
  });

  it('rejects a missing master fingerprint', () => {
    expect(() =>
      parseAccountResponse(
        accountResponse([accountHdKey()], Buffer.alloc(4, 0)),
      ),
    ).toThrow(MissingProtocolFieldError);
  });

  it('rejects a response without keys', () => {
    expect(() => parseAccountResponse(accountResponse([]))).toThrow(
      MissingProtocolFieldError,
    );
  });

  it('rejects a key without an origin path', () => {
    expect(() =>
      parseAccountResponse(
        accountResponse([accountHdKey({ withOrigin: false })]),
      ),
    ).toThrow(MissingProtocolFieldError);
  });

  it('rejects a non CIP-1852 account path', () => {
    const wrongPurpose = DerivationPath([
      44 + HARDENED_OFFSET,
      COIN_TYPE_ADA + HARDENED_OFFSET,
      0 + HARDENED_OFFSET,
    ]);
    expect(() =>
      parseAccountResponse(
        accountResponse([accountHdKey({ path: wrongPurpose })]),
      ),
    ).toThrow(InvalidAccountPathError);
  });

  it('rejects a path deeper than the account level', () => {
    const tooDeep = DerivationPath([
      PURPOSE_CIP1852 + HARDENED_OFFSET,
      COIN_TYPE_ADA + HARDENED_OFFSET,
      0 + HARDENED_OFFSET,
      0,
      0,
    ]);
    expect(() =>
      parseAccountResponse(accountResponse([accountHdKey({ path: tooDeep })])),
    ).toThrow(InvalidAccountPathError);
  });

  it('rejects a key whose source fingerprint contradicts the master fingerprint', () => {
    expect(() =>
      parseAccountResponse(
        accountResponse([
          accountHdKey({ sourceFingerprint: Buffer.from('deadbeef', 'hex') }),
        ]),
      ),
    ).toThrow(FingerprintMismatchError);
  });

  it('rejects a key without a chain code', () => {
    expect(() =>
      parseAccountResponse(
        accountResponse([accountHdKey({ withChainCode: false })]),
      ),
    ).toThrow(MissingProtocolFieldError);
  });

  it('rejects an empty public key', () => {
    expect(() =>
      parseAccountResponse(
        accountResponse([accountHdKey({ key: Buffer.alloc(0) })]),
      ),
    ).toThrow(MissingProtocolFieldError);
  });

  it('rejects a public key of the wrong length', () => {
    expect(() =>
      parseAccountResponse(
        accountResponse([accountHdKey({ key: Buffer.alloc(33, 2) })]),
      ),
    ).toThrow(KeystoneProtocolError);
  });

  it('rejects a chain code of the wrong length', () => {
    expect(() =>
      parseAccountResponse(
        accountResponse([accountHdKey({ code: Buffer.alloc(31, 2) })]),
      ),
    ).toThrow(KeystoneProtocolError);
  });
});
