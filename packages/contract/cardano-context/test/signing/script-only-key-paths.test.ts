import { Cardano } from '@cardano-sdk/core';
import { AddressType, TxInId } from '@cardano-sdk/key-management';
import { describe, expect, it } from 'vitest';

import { getScriptOnlyKeyPaths } from '../../src/signing/script-only-key-paths';

import type { Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type {
  GroupedAddress,
  TxInKeyPathMap,
} from '@cardano-sdk/key-management';

const OWN_ADDRESS =
  'addr_test1qpw0djgj0x59ngrjvqthn7enhvruxnsavsw5th63la3mjel3tkc974sr23jmlzgq5zda4gtv8k9cy38756r9y3qgmkqqjz6aa7' as Cardano.PaymentAddress;
const OWN_REWARD_ACCOUNT =
  'stake_test1urc4mvzl2cp4gedl3yq2px7659krmzuzgnl2dpjjgsydmqqxgamj7' as Cardano.RewardAccount;

const knownAddresses: GroupedAddress[] = [
  {
    type: AddressType.External,
    index: 0,
    networkId: 0 as Cardano.NetworkId,
    accountIndex: 0,
    address: OWN_ADDRESS,
    rewardAccount: OWN_REWARD_ACCOUNT,
    stakeKeyDerivationPath: { role: 2, index: 0 },
  },
];

const ownPaymentKeyHash = Cardano.Address.fromBech32(OWN_ADDRESS)
  .asBase()!
  .getPaymentCredential().hash as unknown as Ed25519KeyHashHex;
const ownStakeKeyHash = Cardano.RewardAccount.toHash(
  OWN_REWARD_ACCOUNT,
) as unknown as Ed25519KeyHashHex;
const foreignKeyHash = 'f'.repeat(56) as unknown as Ed25519KeyHashHex;

const requireSig = (keyHash: Ed25519KeyHashHex): Cardano.NativeScript => ({
  __type: Cardano.ScriptType.Native,
  kind: Cardano.NativeScriptKind.RequireSignature,
  keyHash,
});

const emptyTxBody = { inputs: [], outputs: [], fee: 0n } as Cardano.TxBody;

describe('getScriptOnlyKeyPaths', () => {
  it('returns no paths when the transaction carries no scripts', () => {
    expect(
      getScriptOnlyKeyPaths({
        txBody: emptyTxBody,
        knownAddresses,
        txInKeyPathMap: {},
        scripts: undefined,
      }),
    ).toEqual([]);
  });

  it('returns no paths when the scripts require only foreign keys', () => {
    expect(
      getScriptOnlyKeyPaths({
        txBody: emptyTxBody,
        knownAddresses,
        txInKeyPathMap: {},
        scripts: [requireSig(foreignKeyHash)],
      }),
    ).toEqual([]);
  });

  it('returns the own payment key path required only via a script', () => {
    expect(
      getScriptOnlyKeyPaths({
        txBody: emptyTxBody,
        knownAddresses,
        txInKeyPathMap: {},
        scripts: [requireSig(ownPaymentKeyHash)],
      }),
    ).toEqual([{ index: 0, role: 0 }]);
  });

  it('returns the own stake key path required only via a script', () => {
    expect(
      getScriptOnlyKeyPaths({
        txBody: emptyTxBody,
        knownAddresses,
        txInKeyPathMap: {},
        scripts: [requireSig(ownStakeKeyHash)],
      }),
    ).toEqual([{ role: 2, index: 0 }]);
  });

  it('finds own keys nested in script combinators (RequireAnyOf inside RequireAllOf)', () => {
    expect(
      getScriptOnlyKeyPaths({
        txBody: emptyTxBody,
        knownAddresses,
        txInKeyPathMap: {},
        scripts: [
          {
            __type: Cardano.ScriptType.Native,
            kind: Cardano.NativeScriptKind.RequireAllOf,
            scripts: [
              {
                __type: Cardano.ScriptType.Native,
                kind: Cardano.NativeScriptKind.RequireAnyOf,
                scripts: [
                  requireSig(foreignKeyHash),
                  requireSig(ownPaymentKeyHash),
                ],
              },
            ],
          },
        ],
      }),
    ).toEqual([{ index: 0, role: 0 }]);
  });

  it('returns no paths when the script key is already required by an input', () => {
    const input: Cardano.TxIn = {
      txId: Cardano.TransactionId(`${'0'.repeat(63)}2`),
      index: 0,
    };
    const txBody = { inputs: [input], outputs: [], fee: 0n } as Cardano.TxBody;
    const txInKeyPathMap: TxInKeyPathMap = {
      [TxInId(input)]: { index: 0, role: 0 },
    };

    expect(
      getScriptOnlyKeyPaths({
        txBody,
        knownAddresses,
        txInKeyPathMap,
        scripts: [requireSig(ownPaymentKeyHash)],
      }),
    ).toEqual([]);
  });
});
