import { Cardano } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import { getUniqueSignerKeyHashes } from '../../src/signing/getUniqueSigners';

import type * as Crypto from '@cardano-sdk/crypto';

const basePaymentKeyStakeScript =
  'addr1yx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzerkr0vd4msrxnuwnccdxlhdjar77j6lg0wypcc9uar5d2shs2z78ve';
const basePaymentScriptStakeScript =
  'addr1x8phkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gt7r0vd4msrxnuwnccdxlhdjar77j6lg0wypcc9uar5d2shskhj42g';
const testnetPointerKey =
  'addr_test1gz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer5pnz75xxcrdw5vky';
const testnetRewardKey =
  'stake_test1uqehkck0lajq8gr28t9uxnuvgcqrc6070x3k9r8048z8y5gssrtvn';
const testnetRewardScript =
  'stake_test17rphkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gtcljw6kf';

const keyCred = (hash: string) => ({
  type: Cardano.CredentialType.KeyHash,
  hash: hash as Crypto.Hash32ByteBase16,
});
const scriptCred = (hash: string) => ({
  type: Cardano.CredentialType.ScriptHash,
  hash: hash as Crypto.Hash32ByteBase16,
});

const txIn = (txId: string, index: number): Cardano.TxIn => ({
  txId: txId as Cardano.TransactionId,
  index,
});
const utxo = (
  index: Cardano.TxIn,
  address: string,
  coins: bigint = 0n,
): Cardano.Utxo => [
  { ...index, address: address as Cardano.PaymentAddress },
  { address: address as Cardano.PaymentAddress, value: { coins } },
];

describe('getUniqueSignerKeyHashes', () => {
  it('includes required extra signatures and dedupes them', () => {
    const tx = {
      body: {
        inputs: [],
        requiredExtraSignatures: [
          'aa',
          'bb',
          'aa',
        ] as Crypto.Hash32ByteBase16[],
      },
      witness: { scripts: [] as unknown[] },
    } as unknown as Cardano.Tx;

    const result = getUniqueSignerKeyHashes(tx, []);
    expect([...result].sort()).toEqual(['aa', 'bb']);
  });

  it('adds input signer key hashes for inputs and collaterals (found in resolvedInputs)', () => {
    const index0 = txIn('t1', 0);
    const index1 = txIn('t1', 1);
    const c0 = txIn('t9', 0);

    const tx = {
      body: {
        inputs: [index0, index1],
        collaterals: [c0],
      },
      witness: { scripts: [] as unknown[] },
    } as unknown as Cardano.Tx;

    const resolved: Cardano.Utxo[] = [
      utxo(index0, basePaymentKeyStakeScript, 10n),
      utxo(c0, testnetPointerKey, 5n),
    ];

    const result = getUniqueSignerKeyHashes(tx, resolved);
    expect(new Set(result)).toEqual(
      new Set(['9493315cd92eb5d8c4304e67b7e16ae36d61d34502694657811a2c8e']),
    );
  });

  it('paymentKeyHashFromAddress returns undefined for script credentials and reward addresses', () => {
    const t = {
      body: { inputs: [txIn('x', 0)] },
      witness: { scripts: [] },
    } as unknown as Cardano.Tx;

    const resolved: Cardano.Utxo[] = [
      utxo(txIn('x', 0), basePaymentScriptStakeScript, 1n),
    ];
    let result = getUniqueSignerKeyHashes(t, resolved);
    expect(result.size).toBe(0);

    const resolved2: Cardano.Utxo[] = [
      utxo(txIn('x', 0), testnetRewardKey, 1n),
    ];
    result = getUniqueSignerKeyHashes(t, resolved2);
    expect(result.size).toBe(0);
  });

  it('withdrawals: adds KeyHash from reward addresses', () => {
    const tx = {
      body: {
        inputs: [],
        withdrawals: [{ stakeAddress: testnetRewardKey }],
      },
      witness: { scripts: [] },
    } as unknown as Cardano.Tx;

    const result = getUniqueSignerKeyHashes(tx, []);
    expect(
      result.has('337b62cfff6403a06a3acbc34f8c46003c69fe79a3628cefa9c47251'),
    ).toBe(true);
  });

  it('withdrawals: ignores ScriptHash reward credentials', () => {
    const tx = {
      body: {
        inputs: [],
        withdrawals: [{ stakeAddress: testnetRewardScript }],
      },
      witness: { scripts: [] },
    } as unknown as Cardano.Tx;

    const result = getUniqueSignerKeyHashes(tx, []);
    expect(result.size).toBe(0);
  });

  it('certificates: stake-related kinds add stakeCredential (as implemented)', () => {
    const stakeKH = keyCred('stake-cred-kh');
    const includedKinds = [
      Cardano.CertificateType.VoteDelegation,
      Cardano.CertificateType.StakeVoteDelegation,
      Cardano.CertificateType.StakeRegistrationDelegation,
      Cardano.CertificateType.VoteRegistrationDelegation,
      Cardano.CertificateType.StakeVoteRegistrationDelegation,
      Cardano.CertificateType.Registration,
      Cardano.CertificateType.Unregistration,
      Cardano.CertificateType.StakeDeregistration,
      Cardano.CertificateType.StakeDelegation,
    ];

    const tx = {
      body: {
        inputs: [],
        certificates: includedKinds.map(__typename => ({
          __typename,
          stakeCredential: stakeKH,
        })),
      },
      witness: { scripts: [] },
    } as unknown as Cardano.Tx;

    const result = getUniqueSignerKeyHashes(tx, []);
    expect(result.has('stake-cred-kh')).toBe(true);
    expect(result.size).toBe(1);
  });

  it('certificates: dRep kinds add dRepCredential; ignored kinds do not add', () => {
    const drepKH = keyCred('drep-kh');

    const includedDRep = [
      Cardano.CertificateType.RegisterDelegateRepresentative,
      Cardano.CertificateType.UnregisterDelegateRepresentative,
      Cardano.CertificateType.UpdateDelegateRepresentative,
    ].map(__typename => ({ __typename, dRepCredential: drepKH }));

    const ignored = [
      Cardano.CertificateType.StakeRegistration,
      Cardano.CertificateType.PoolRegistration,
      Cardano.CertificateType.PoolRetirement,
      Cardano.CertificateType.MIR,
      Cardano.CertificateType.GenesisKeyDelegation,
      Cardano.CertificateType.AuthorizeCommitteeHot,
      Cardano.CertificateType.ResignCommitteeCold,
    ].map(__typename => ({ __typename, stakeCredential: keyCred('ignored') }));

    const tx = {
      body: {
        inputs: [],
        certificates: [...includedDRep, ...ignored],
      },
      witness: { scripts: [] },
    } as unknown as Cardano.Tx;

    const result = getUniqueSignerKeyHashes(tx, []);
    expect(result.has('drep-kh')).toBe(true);
    expect(result.size).toBe(1);
  });

  it('votingProcedures: adds voter.credential when KeyHash', () => {
    const tx = {
      body: {
        inputs: [],
        votingProcedures: [
          { voter: { credential: keyCred('voter-kh') } },
          { voter: { credential: scriptCred('voter-sh') } }, // ignored
        ],
      },
      witness: { scripts: [] },
    } as unknown as Cardano.Tx;

    const result = getUniqueSignerKeyHashes(tx, []);
    expect(result.has('voter-kh')).toBe(true);
    expect(result.size).toBe(1);
  });

  it('native scripts: collects RequireSignature and recurses into all-of/any-of/n-of', () => {
    const scripts: Cardano.Script[] = [
      {
        __type: Cardano.ScriptType.Native,
        kind: Cardano.NativeScriptKind.RequireSignature,
        keyHash: 'ns1' as Crypto.Ed25519KeyHashHex,
      },
      {
        __type: Cardano.ScriptType.Native,
        kind: Cardano.NativeScriptKind.RequireAllOf,
        scripts: [
          {
            __type: Cardano.ScriptType.Native,
            kind: Cardano.NativeScriptKind.RequireSignature,
            keyHash: 'ns2' as Crypto.Ed25519KeyHashHex,
          },
          {
            __type: Cardano.ScriptType.Native,
            kind: Cardano.NativeScriptKind.RequireAnyOf,
            scripts: [
              {
                __type: Cardano.ScriptType.Native,
                kind: Cardano.NativeScriptKind.RequireSignature,
                keyHash: 'ns3' as Crypto.Ed25519KeyHashHex,
              },
              {
                __type: Cardano.ScriptType.Native,
                kind: Cardano.NativeScriptKind.RequireNOf,
                required: 1,
                scripts: [
                  {
                    __type: Cardano.ScriptType.Native,
                    kind: Cardano.NativeScriptKind.RequireSignature,
                    keyHash: 'ns4' as Crypto.Ed25519KeyHashHex,
                  },
                ],
              },
            ],
          },
          {
            __type: Cardano.ScriptType.Native,
            kind: Cardano.NativeScriptKind.RequireTimeAfter,
            slot: Cardano.Slot(123),
          },
        ],
      },
    ];

    const tx = {
      body: {
        inputs: [],
      },
      witness: { scripts },
    } as unknown as Cardano.Tx;

    const result = getUniqueSignerKeyHashes(tx, []);
    expect(new Set(result)).toEqual(new Set(['ns1', 'ns2', 'ns3', 'ns4']));
  });

  it('integration: combines everything and dedupes', () => {
    const required = ['aa', 'bb', 'aa'];

    const index0 = txIn('T', 0);
    const ic = txIn('T', 9);

    const stakeKH = keyCred('stake-x');
    const drepKH = keyCred('drep-y');

    const scripts = [
      {
        __type: Cardano.ScriptType.Native,
        kind: Cardano.NativeScriptKind.RequireSignature,
        keyHash: 'ns5',
      },
      {
        __type: Cardano.ScriptType.Native,
        kind: Cardano.NativeScriptKind.RequireTimeBefore,
        slot: 999n,
      },
    ];

    const tx = {
      body: {
        inputs: [index0],
        collaterals: [ic],
        requiredExtraSignatures: required,
        withdrawals: [{ stakeAddress: testnetRewardKey }],
        certificates: [
          {
            __typename: Cardano.CertificateType.StakeDelegation,
            stakeCredential: stakeKH,
          },
          {
            __typename: Cardano.CertificateType.RegisterDelegateRepresentative,
            dRepCredential: drepKH,
          },
          {
            __typename: Cardano.CertificateType.PoolRegistration,
            stakeCredential: keyCred('ignored'),
          }, // ignored by impl
        ],
      },
      witness: { scripts },
    } as unknown as Cardano.Tx;

    const resolved: Cardano.Utxo[] = [
      utxo(index0, basePaymentKeyStakeScript, 2n),
      utxo(ic, testnetPointerKey, 1n),
    ];

    const result = getUniqueSignerKeyHashes(tx, resolved);
    expect(new Set(result)).toEqual(
      new Set([
        'aa',
        'bb',
        '9493315cd92eb5d8c4304e67b7e16ae36d61d34502694657811a2c8e',
        '337b62cfff6403a06a3acbc34f8c46003c69fe79a3628cefa9c47251',
        'stake-x',
        'drep-y',
        'ns5',
      ]),
    );
  });

  it('handles undefined/empty fields gracefully (no throws)', () => {
    const tx = {
      body: {
        inputs: [],
      },
      witness: {},
    } as unknown as Cardano.Tx;

    const result = getUniqueSignerKeyHashes(tx, []);
    expect(result.size).toBe(0);
  });
});
