import { Cardano } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import {
  createCustodyAccountRecord,
  CURRENT_CUSTODY_CONTRACT_VERSION,
  deriveCustodyAccountIdentity,
  parseCustodyAccountRecord,
} from '../src';
import { canonicalCustodyAccountRecord } from '../src/record';

import {
  PREPROD_ADDRESS,
  PREPROD_OWNER,
  PREPROD_STAKE_SCRIPT_HASH,
} from './fixtures';

import type { CustodyAccountIdentity, CustodyAccountRecord } from '../src';

const PREPROD = Cardano.ChainIds.Preprod.networkMagic;
const PREVIEW = Cardano.ChainIds.Preview.networkMagic;
const MAINNET = Cardano.ChainIds.Mainnet.networkMagic;
const ACCOUNT_VALIDATOR_HASH =
  CURRENT_CUSTODY_CONTRACT_VERSION.accountValidatorHash;

const identityOn = (chainId: Cardano.ChainId): CustodyAccountIdentity => {
  const result = deriveCustodyAccountIdentity({
    contractVersion: CURRENT_CUSTODY_CONTRACT_VERSION,
    creatorKeyHash: PREPROD_OWNER,
    chainId,
  });
  if (!result.ok) throw new Error('The Preprod owner was refused');
  return result.value;
};

const preprodIdentity = identityOn(Cardano.ChainIds.Preprod);
const preprodRecord = createCustodyAccountRecord(preprodIdentity);

const keyAddress = Cardano.EnterpriseAddress.fromCredentials(
  Cardano.NetworkId.Testnet,
  {
    type: Cardano.CredentialType.KeyHash,
    hash: PREPROD_OWNER as Cardano.Credential['hash'],
  },
)
  .toAddress()
  .toBech32();

const recordJson = (changes: Record<string, unknown> = {}): string =>
  JSON.stringify({ ...preprodRecord, ...changes });

describe('createCustodyAccountRecord', () => {
  it('describes the account with its network magic and contract version', () => {
    expect(preprodRecord).toEqual({
      type: 'cardano-custody-account',
      version: 1,
      networkMagic: PREPROD,
      accountValidatorHash: ACCOUNT_VALIDATOR_HASH,
      creatorKeyHash: PREPROD_OWNER,
      stakeScriptHash: PREPROD_STAKE_SCRIPT_HASH,
      address: PREPROD_ADDRESS,
    });
  });
});

describe('canonicalCustodyAccountRecord', () => {
  it('writes the record fields only, in canonical order', () => {
    const reordered = Object.fromEntries([
      ['extra', 'dropped'],
      ...Object.entries(preprodRecord).reverse(),
    ]) as CustodyAccountRecord;
    expect(JSON.stringify(canonicalCustodyAccountRecord(reordered))).toBe(
      `{"type":"cardano-custody-account","version":1,"networkMagic":1,"accountValidatorHash":"${ACCOUNT_VALIDATOR_HASH}","creatorKeyHash":"${PREPROD_OWNER}","stakeScriptHash":"${PREPROD_STAKE_SCRIPT_HASH}","address":"${PREPROD_ADDRESS}"}`,
    );
  });
});

describe('parseCustodyAccountRecord', () => {
  it('accepts a serialized record and re-derives its identity', () => {
    const parsed = parseCustodyAccountRecord(
      JSON.stringify(preprodRecord),
      PREPROD,
    );
    expect(parsed).toEqual({
      ok: true,
      value: { record: preprodRecord, identity: preprodIdentity },
    });
  });

  it('accepts an already parsed record', () => {
    expect(
      parseCustodyAccountRecord({ ...preprodRecord }, PREPROD),
    ).toMatchObject({
      ok: true,
      value: { record: preprodRecord },
    });
  });

  it('accepts the upstream record shape on the selected network', () => {
    const upstream = {
      owner: PREPROD_OWNER,
      stakeScriptHash: PREPROD_STAKE_SCRIPT_HASH,
      address: PREPROD_ADDRESS,
    };
    expect(parseCustodyAccountRecord(upstream, PREPROD)).toEqual({
      ok: true,
      value: { record: preprodRecord, identity: preprodIdentity },
    });
    const onPreview = parseCustodyAccountRecord(
      JSON.stringify(upstream),
      PREVIEW,
    );
    expect(onPreview.ok && onPreview.value.record.networkMagic).toBe(PREVIEW);
  });

  describe('step 1', () => {
    it.each<[string, unknown, string | undefined]>([
      ['text that is not JSON', '{', undefined],
      ['an array', '[]', undefined],
      ['null', null, undefined],
      [
        'a missing field',
        JSON.stringify({ ...preprodRecord, address: undefined }),
        undefined,
      ],
      ['an extra field', recordJson({ devices: [] }), undefined],
      ['another type', recordJson({ type: 'cardano-account' }), 'type'],
      ['another version', recordJson({ version: 2 }), 'version'],
      [
        'a negative network magic',
        recordJson({ networkMagic: -1 }),
        'networkMagic',
      ],
      [
        'a fractional network magic',
        recordJson({ networkMagic: 1.5 }),
        'networkMagic',
      ],
      [
        'a network magic beyond 32 bits',
        recordJson({ networkMagic: 2 ** 32 }),
        'networkMagic',
      ],
      [
        'a textual network magic',
        recordJson({ networkMagic: '1' }),
        'networkMagic',
      ],
      [
        'a short account validator hash',
        recordJson({ accountValidatorHash: ACCOUNT_VALIDATOR_HASH.slice(2) }),
        'accountValidatorHash',
      ],
      [
        'an upper-case creator key hash',
        recordJson({ creatorKeyHash: PREPROD_OWNER.toUpperCase() }),
        'creatorKeyHash',
      ],
      [
        'a stake script hash that is not hex',
        recordJson({ stakeScriptHash: 'zz'.repeat(28) }),
        'stakeScriptHash',
      ],
      [
        'an address that does not parse',
        recordJson({ address: 'addr_test1nope' }),
        'address',
      ],
      ['an address that is not text', recordJson({ address: 1 }), 'address'],
      [
        'an address given as hex bytes',
        recordJson({
          address: Cardano.Address.fromBech32(PREPROD_ADDRESS).toBytes(),
        }),
        'address',
      ],
      [
        'an upstream record with an extra field',
        {
          owner: PREPROD_OWNER,
          stakeScriptHash: PREPROD_STAKE_SCRIPT_HASH,
          address: PREPROD_ADDRESS,
          networkMagic: 1,
        },
        undefined,
      ],
      [
        'an upstream record with a short owner',
        {
          owner: 'aa',
          stakeScriptHash: PREPROD_STAKE_SCRIPT_HASH,
          address: PREPROD_ADDRESS,
        },
        'owner',
      ],
      [
        'an upstream record with a key address',
        {
          owner: PREPROD_OWNER,
          stakeScriptHash: PREPROD_STAKE_SCRIPT_HASH,
          address: keyAddress,
        },
        'address',
      ],
      [
        'an upstream record with an address that does not parse',
        {
          owner: PREPROD_OWNER,
          stakeScriptHash: PREPROD_STAKE_SCRIPT_HASH,
          address: 'x',
        },
        'address',
      ],
    ])('refuses %s', (_, input, field) => {
      const result = parseCustodyAccountRecord(input, PREPROD);
      expect(result.ok).toBe(false);
      expect(!result.ok && result.error).toMatchObject({
        step: 1,
        code: 'malformed-record',
      });
      expect(
        !result.ok &&
          result.error.code === 'malformed-record' &&
          result.error.field,
      ).toBe(field);
    });
  });

  describe('step 2', () => {
    it('refuses an account validator that is not a pinned version', () => {
      expect(
        parseCustodyAccountRecord(
          recordJson({ accountValidatorHash: 'cc'.repeat(28) }),
          PREPROD,
        ),
      ).toEqual({
        ok: false,
        error: {
          step: 2,
          code: 'unsupported-contract-version',
          accountValidatorHash: 'cc'.repeat(28),
        },
      });
    });

    it('reads the account validator of an upstream record from its address', () => {
      const foreignAddress = Cardano.BaseAddress.fromCredentials(
        Cardano.NetworkId.Testnet,
        {
          type: Cardano.CredentialType.ScriptHash,
          hash: 'cc'.repeat(28) as Cardano.Credential['hash'],
        },
        {
          type: Cardano.CredentialType.ScriptHash,
          hash: PREPROD_STAKE_SCRIPT_HASH as Cardano.Credential['hash'],
        },
      )
        .toAddress()
        .toBech32();
      expect(
        parseCustodyAccountRecord(
          {
            owner: PREPROD_OWNER,
            stakeScriptHash: PREPROD_STAKE_SCRIPT_HASH,
            address: foreignAddress,
          },
          PREPROD,
        ),
      ).toMatchObject({
        ok: false,
        error: { step: 2, accountValidatorHash: 'cc'.repeat(28) },
      });
    });
  });

  describe('step 3', () => {
    it('refuses a stake script hash the creator key does not derive', () => {
      // The mint accepts any stake script, so a lookalike account is possible.
      expect(
        parseCustodyAccountRecord(
          recordJson({ stakeScriptHash: 'dd'.repeat(28) }),
          PREPROD,
        ),
      ).toEqual({
        ok: false,
        error: {
          step: 3,
          code: 'stake-script-hash-mismatch',
          expected: PREPROD_STAKE_SCRIPT_HASH,
          actual: 'dd'.repeat(28),
        },
      });
      expect(
        parseCustodyAccountRecord(
          recordJson({ creatorKeyHash: 'aa'.repeat(28) }),
          PREPROD,
        ),
      ).toMatchObject({
        ok: false,
        error: { step: 3 },
      });
    });
  });

  describe('step 4', () => {
    it('refuses an address on another network id', () => {
      const mainnetAddress = identityOn(Cardano.ChainIds.Mainnet).address;
      expect(
        parseCustodyAccountRecord(
          recordJson({ address: mainnetAddress }),
          PREPROD,
        ),
      ).toEqual({
        ok: false,
        error: {
          step: 4,
          code: 'address-mismatch',
          expected: PREPROD_ADDRESS,
          actual: mainnetAddress,
        },
      });
    });

    it('refuses an address with another stake part', () => {
      const keyStaked = Cardano.BaseAddress.fromCredentials(
        Cardano.NetworkId.Testnet,
        {
          type: Cardano.CredentialType.ScriptHash,
          hash: ACCOUNT_VALIDATOR_HASH,
        },
        {
          type: Cardano.CredentialType.KeyHash,
          hash: PREPROD_STAKE_SCRIPT_HASH as Cardano.Credential['hash'],
        },
      )
        .toAddress()
        .toBech32();
      expect(
        parseCustodyAccountRecord(recordJson({ address: keyStaked }), PREPROD),
      ).toMatchObject({
        ok: false,
        error: { step: 4, actual: keyStaked },
      });
    });

    it('refuses a mainnet record whose address is a testnet one', () => {
      expect(
        parseCustodyAccountRecord(
          recordJson({ networkMagic: MAINNET }),
          MAINNET,
        ),
      ).toMatchObject({
        ok: false,
        error: {
          step: 4,
          expected: identityOn(Cardano.ChainIds.Mainnet).address,
        },
      });
    });

    it('refuses an upstream testnet record on mainnet', () => {
      expect(
        parseCustodyAccountRecord(
          {
            owner: PREPROD_OWNER,
            stakeScriptHash: PREPROD_STAKE_SCRIPT_HASH,
            address: PREPROD_ADDRESS,
          },
          MAINNET,
        ),
      ).toMatchObject({ ok: false, error: { step: 4 } });
    });
  });

  describe('step 5', () => {
    it('refuses a Preview record while Preprod is selected, though the addresses are equal', () => {
      const previewRecord = createCustodyAccountRecord(
        identityOn(Cardano.ChainIds.Preview),
      );
      expect(previewRecord.address).toBe(preprodRecord.address);
      expect(
        parseCustodyAccountRecord(JSON.stringify(previewRecord), PREPROD),
      ).toEqual({
        ok: false,
        error: {
          step: 5,
          code: 'network-mismatch',
          expected: PREPROD,
          actual: PREVIEW,
        },
      });
    });
  });
});
