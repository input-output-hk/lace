import { Buffer } from 'buffer';
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  CryptoKeypath,
  PathComponent,
} from '@keystonehq/bc-ur-registry-cardano';
import {
  Curve,
  DerivationAlgorithm,
  KeystoneSDK,
  UR,
} from '@keystonehq/keystone-sdk';
import { describe, expect, it } from 'vitest';

import {
  buildAccountRequest,
  parseAccountResponse,
} from '../src/flows/account';
import { buildDataSignRequest, parseDataSignResponse } from '../src/flows/data';
import { buildTxSignRequest, parseTxSignResponse } from '../src/flows/tx';
import {
  ADA_TX_SIZE_LIMIT,
  buildTxHashSignRequest,
  parseTxHashSignResponse,
} from '../src/flows/tx-hash';
import { KeystoneUrType } from '../src/ur-types';
import {
  DerivationPath,
  HARDENED_OFFSET,
} from '../src/value-objects/derivation-path.vo';
import { RequestId } from '../src/value-objects/request-id.vo';
import { Xfp } from '../src/value-objects/xfp.vo';

/**
 * Golden tests against CBOR evidence produced by the official
 * @keystonehq/keystone-sdk and Keystone BC-UR registry classes (see
 * test/fixtures/README.md). The fixtures are the wire-format source of truth;
 * these tests prove this library's builders produce byte-identical request
 * CBOR and its parsers decode device responses to the exact values the
 * official stack emits. Each request is additionally re-generated with the
 * live SDK and each response re-parsed with it, so the fixture, the SDK, and
 * this library can never drift apart unnoticed.
 */

interface AccountKeyFixture {
  account_index: number;
  path: number[];
  public_key: string;
  chain_code: string;
  extended_public_key: string;
}

interface AccountFixture {
  origin: string;
  account_indexes: number[];
  request_cbor: string;
  response_cbor: string;
  decoded: {
    master_fingerprint: string;
    device: string;
    keys: AccountKeyFixture[];
  };
}

interface UtxoFixture {
  transaction_hash: string;
  index: number;
  amount: string;
  xfp: string;
  path: number[];
  address: string;
}

interface ExtraSignerFixture {
  key_hash: string;
  xfp: string;
  path: number[];
}

interface TxFixture {
  request_id: string;
  origin: string;
  sign_data: string;
  utxos: UtxoFixture[];
  extra_signers: ExtraSignerFixture[];
  request_cbor: string;
  response_cbor: string;
  decoded: {
    request_id: string;
    witness_set: string;
  };
}

interface SignerPathFixture {
  xfp: string;
  path: number[];
}

interface TxHashFixture {
  request_id: string;
  origin: string;
  tx_hash: string;
  paths: SignerPathFixture[];
  address_list: string[];
  request_cbor: string;
  response_cbor: string;
  decoded: {
    witness_set: string;
  };
}

interface DataFixture {
  request_id: string;
  origin: string;
  sign_data: string;
  path: number[];
  xfp: string;
  signing_key_public_key: string;
  request_cbor: string;
  response_cbor: string;
  decoded: {
    request_id: string;
    signature: string;
    public_key: string;
  };
}

interface Evidence {
  account: AccountFixture;
  tx: TxFixture;
  tx_hash: TxHashFixture;
  data: DataFixture;
}

const evidence = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'keystone-evidence.json'), 'utf8'),
) as Evidence;

const fromHex = (hex: string): Uint8Array =>
  new Uint8Array(Buffer.from(hex, 'hex'));
const toHex = (bytes: Uint8Array): string => Buffer.from(bytes).toString('hex');

const sdk = new KeystoneSDK();

describe('golden: account export', () => {
  const fixture = evidence.account;

  it('builds a request byte-identical to the fixture', () => {
    const built = buildAccountRequest({
      accountIndexes: fixture.account_indexes,
      origin: fixture.origin,
    });
    expect(built.urType).toBe(KeystoneUrType.AccountRequest);
    expect(toHex(built.cbor)).toBe(fixture.request_cbor);
  });

  it('builds a request byte-identical to the live SDK output', () => {
    const ur = sdk.generateKeyDerivationCall({
      schemas: fixture.account_indexes.map(accountIndex => ({
        path: `m/1852'/1815'/${accountIndex}'`,
        curve: Curve.ed25519,
        algo: DerivationAlgorithm.bip32ed25519,
        chainType: 'ADA',
      })),
      origin: fixture.origin,
    });
    const built = buildAccountRequest({
      accountIndexes: fixture.account_indexes,
      origin: fixture.origin,
    });
    expect(built.urType).toBe(ur.type);
    expect(toHex(built.cbor)).toBe(ur.cbor.toString('hex'));
  });

  it('parses the fixture response to the expected fields', () => {
    const parsed = parseAccountResponse({
      urType: KeystoneUrType.AccountResponse,
      cbor: fromHex(fixture.response_cbor),
    });
    expect(Xfp.toHex(parsed.masterFingerprint)).toBe(
      fixture.decoded.master_fingerprint,
    );
    expect(parsed.device).toBe(fixture.decoded.device);
    expect(parsed.accounts).toHaveLength(fixture.decoded.keys.length);
    parsed.accounts.forEach((account, index) => {
      const expected = fixture.decoded.keys[index];
      expect(account.accountIndex).toBe(expected.account_index);
      expect([...account.path]).toEqual(expected.path);
      expect(toHex(account.publicKey)).toBe(expected.public_key);
      expect(toHex(account.chainCode)).toBe(expected.chain_code);
      expect(toHex(account.extendedPublicKey)).toBe(
        expected.extended_public_key,
      );
    });
  });

  it('parses the fixture response to the same values as the live SDK', () => {
    const multiAccounts = sdk.parseMultiAccounts(
      new UR(
        Buffer.from(fixture.response_cbor, 'hex'),
        KeystoneUrType.AccountResponse,
      ),
    );
    const parsed = parseAccountResponse({
      urType: KeystoneUrType.AccountResponse,
      cbor: fromHex(fixture.response_cbor),
    });
    expect(Xfp.toHex(parsed.masterFingerprint)).toBe(
      multiAccounts.masterFingerprint,
    );
    expect(parsed.device).toBe(multiAccounts.device);
    expect(toHex(parsed.accounts[0].publicKey)).toBe(
      multiAccounts.keys[0].publicKey,
    );
    expect(toHex(parsed.accounts[0].chainCode)).toBe(
      multiAccounts.keys[0].chainCode,
    );
  });
});

describe('golden: transaction signing', () => {
  const fixture = evidence.tx;

  const params = {
    requestId: RequestId(fixture.request_id),
    signData: fromHex(fixture.sign_data),
    utxos: fixture.utxos.map(utxo => ({
      transactionHash: fromHex(utxo.transaction_hash),
      index: utxo.index,
      amount: utxo.amount,
      address: utxo.address,
      path: DerivationPath(utxo.path),
      xfp: Xfp.fromHex(utxo.xfp),
    })),
    extraSigners: fixture.extra_signers.map(signer => ({
      keyHash: fromHex(signer.key_hash),
      path: DerivationPath(signer.path),
      xfp: Xfp.fromHex(signer.xfp),
    })),
    origin: fixture.origin,
  };

  it('builds a request byte-identical to the fixture', () => {
    const built = buildTxSignRequest(params);
    expect(built.urType).toBe(KeystoneUrType.TxSignRequest);
    expect(toHex(built.cbor)).toBe(fixture.request_cbor);
  });

  it('builds a request byte-identical to the live SDK output', () => {
    const ur = sdk.cardano.generateSignRequest({
      signData: Buffer.from(fixture.sign_data, 'hex'),
      utxos: fixture.utxos.map(utxo => ({
        transactionHash: utxo.transaction_hash,
        index: utxo.index,
        amount: utxo.amount,
        xfp: utxo.xfp,
        hdPath: DerivationPath.toPathString(DerivationPath(utxo.path)),
        address: utxo.address,
      })),
      extraSigners: fixture.extra_signers.map(signer => ({
        keyHash: signer.key_hash,
        xfp: signer.xfp,
        keyPath: DerivationPath.toPathString(DerivationPath(signer.path)),
      })),
      requestId: fixture.request_id,
      origin: fixture.origin,
    });
    const built = buildTxSignRequest(params);
    expect(built.urType).toBe(ur.type);
    expect(toHex(built.cbor)).toBe(ur.cbor.toString('hex'));
  });

  it('parses the fixture response to the expected fields', () => {
    const parsed = parseTxSignResponse({
      urType: KeystoneUrType.TxSignResponse,
      cbor: fromHex(fixture.response_cbor),
    });
    expect(parsed.requestId).toBe(fixture.decoded.request_id);
    expect(toHex(parsed.witnessSet)).toBe(fixture.decoded.witness_set);
  });

  it('parses the fixture response to the same values as the live SDK', () => {
    const signature = sdk.cardano.parseSignature(
      new UR(
        Buffer.from(fixture.response_cbor, 'hex'),
        KeystoneUrType.TxSignResponse,
      ),
    );
    const parsed = parseTxSignResponse({
      urType: KeystoneUrType.TxSignResponse,
      cbor: fromHex(fixture.response_cbor),
    });
    expect(parsed.requestId).toBe(signature.requestId);
    expect(toHex(parsed.witnessSet)).toBe(signature.witnessSet);
  });
});

describe('golden: transaction hash signing', () => {
  const fixture = evidence.tx_hash;

  const params = {
    requestId: RequestId(fixture.request_id),
    txHash: fromHex(fixture.tx_hash),
    paths: fixture.paths.map(signer => ({
      path: DerivationPath(signer.path),
      xfp: Xfp.fromHex(signer.xfp),
    })),
    addressList: fixture.address_list,
    origin: fixture.origin,
  };

  const toSdkKeypath = (signer: SignerPathFixture): CryptoKeypath =>
    new CryptoKeypath(
      signer.path.map(
        component =>
          new PathComponent({
            index:
              component >= HARDENED_OFFSET
                ? component - HARDENED_OFFSET
                : component,
            hardened: component >= HARDENED_OFFSET,
          }),
      ),
      Buffer.from(signer.xfp, 'hex'),
    );

  it('builds a request byte-identical to the fixture', () => {
    const built = buildTxHashSignRequest(params);
    expect(built.urType).toBe(KeystoneUrType.TxHashSignRequest);
    expect(toHex(built.cbor)).toBe(fixture.request_cbor);
  });

  it('builds a request byte-identical to the live SDK output', () => {
    const ur = sdk.cardano.generateSignTxHashRequest(
      fixture.tx_hash,
      fixture.paths.map(toSdkKeypath),
      [...fixture.address_list],
      fixture.origin,
      fixture.request_id,
    );
    const built = buildTxHashSignRequest(params);
    expect(built.urType).toBe(ur.type);
    expect(toHex(built.cbor)).toBe(ur.cbor.toString('hex'));
  });

  it('matches the request the live SDK falls back to for an oversized transaction', () => {
    const oversizedSignData = Buffer.alloc(ADA_TX_SIZE_LIMIT, 0x42);
    const txFixture = evidence.tx;
    const ur = sdk.cardano.generateSignRequest({
      signData: oversizedSignData,
      utxos: txFixture.utxos.map(utxo => ({
        transactionHash: utxo.transaction_hash,
        index: utxo.index,
        amount: utxo.amount,
        xfp: utxo.xfp,
        hdPath: DerivationPath.toPathString(DerivationPath(utxo.path)),
        address: utxo.address,
      })),
      extraSigners: txFixture.extra_signers.map(signer => ({
        keyHash: signer.key_hash,
        xfp: signer.xfp,
        keyPath: DerivationPath.toPathString(DerivationPath(signer.path)),
      })),
      requestId: txFixture.request_id,
      origin: txFixture.origin,
    });
    expect(ur.type).toBe(KeystoneUrType.TxHashSignRequest);

    const built = buildTxHashSignRequest({
      ...params,
      txHash: fromHex(sdk.cardano.generateTxHash(oversizedSignData)),
    });
    expect(toHex(built.cbor)).toBe(ur.cbor.toString('hex'));
  });

  it('agrees with the live SDK on the hash signing size threshold', () => {
    expect(
      sdk.cardano.checkNeedSignTxHash(Buffer.alloc(ADA_TX_SIZE_LIMIT - 1)),
    ).toBe(false);
    expect(
      sdk.cardano.checkNeedSignTxHash(Buffer.alloc(ADA_TX_SIZE_LIMIT)),
    ).toBe(true);
  });

  it('parses the raw witness set reply to the fixture bytes', () => {
    const parsed = parseTxHashSignResponse({
      urType: KeystoneUrType.TxSignResponse,
      cbor: fromHex(fixture.response_cbor),
    });
    expect(toHex(parsed.witnessSet)).toBe(fixture.decoded.witness_set);
  });
});

describe('golden: CIP-8 data signing', () => {
  const fixture = evidence.data;

  const params = {
    requestId: RequestId(fixture.request_id),
    signData: fromHex(fixture.sign_data),
    path: DerivationPath(fixture.path),
    xfp: Xfp.fromHex(fixture.xfp),
    signingKeyPublicKey: fromHex(fixture.signing_key_public_key),
    origin: fixture.origin,
  };

  it('builds a request byte-identical to the fixture', () => {
    const built = buildDataSignRequest(params);
    expect(built.urType).toBe(KeystoneUrType.DataSignRequest);
    expect(toHex(built.cbor)).toBe(fixture.request_cbor);
  });

  it('builds a request byte-identical to the live SDK output', () => {
    const ur = sdk.cardano.generateSignDataRequest({
      requestId: fixture.request_id,
      sigStructure: fixture.sign_data,
      path: DerivationPath.toPathString(DerivationPath(fixture.path)),
      xfp: fixture.xfp,
      pubKey: fixture.signing_key_public_key,
      origin: fixture.origin,
    });
    const built = buildDataSignRequest(params);
    expect(built.urType).toBe(ur.type);
    expect(toHex(built.cbor)).toBe(ur.cbor.toString('hex'));
  });

  it('parses the fixture response to the expected fields', () => {
    const parsed = parseDataSignResponse({
      urType: KeystoneUrType.DataSignResponse,
      cbor: fromHex(fixture.response_cbor),
    });
    expect(parsed.requestId).toBe(fixture.decoded.request_id);
    expect(toHex(parsed.signature)).toBe(fixture.decoded.signature);
    expect(toHex(parsed.publicKey)).toBe(fixture.decoded.public_key);
  });

  it('parses the fixture response to the same values as the live SDK', () => {
    const signature = sdk.cardano.parseSignDataSignature(
      new UR(
        Buffer.from(fixture.response_cbor, 'hex'),
        KeystoneUrType.DataSignResponse,
      ),
    );
    const parsed = parseDataSignResponse({
      urType: KeystoneUrType.DataSignResponse,
      cbor: fromHex(fixture.response_cbor),
    });
    expect(parsed.requestId).toBe(signature.requestId);
    expect(toHex(parsed.signature)).toBe(signature.signature);
    expect(toHex(parsed.publicKey)).toBe(signature.publicKey);
  });
});
