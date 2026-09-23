import { Cardano, Serialization } from '@cardano-sdk/core';
import { TokenId } from '@lace-contract/tokens';
import { HexBytes } from '@lace-lib/util';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { inspectCardanoTxEffects } from '../src/inspect-cardano-tx-effects';
import { CardanoPaymentAddress } from '../src/types';

/** One address, two brands: the SDK's for building, ours for the account set. */
const OWN_ADDRESS = Cardano.PaymentAddress(
  'addr_test1qphhr294v0w0rzgk7kz4ynsp8hwt82ha6nsp8yk6h04fhzsuryus5g7pm3lq85msee5pdtqlnv2crdc83kk2tvhsefcsu2snle',
);
const OWN_ACCOUNT_ADDRESS = CardanoPaymentAddress(OWN_ADDRESS);
const FOREIGN_ADDRESS = Cardano.PaymentAddress(
  'addr_test1qqt3r9kd56aq9ajynjkz8hdfw3kc0pcv3tpzug8azxls62tvvz7nw9gmznn65g4ksrrfvyzhz52knc3mqxdyya47gz2qmcjmcq',
);
const SCRIPT_ADDRESS = new Cardano.Address({
  networkId: Cardano.NetworkId.Testnet,
  paymentPart: {
    hash: 'a'.repeat(56) as Cardano.Credential['hash'],
    type: Cardano.CredentialType.ScriptHash,
  },
  type: Cardano.AddressType.EnterpriseScript,
}).toBech32() as Cardano.PaymentAddress;

const REWARD_ACCOUNT = new Cardano.Address({
  networkId: Cardano.NetworkId.Testnet,
  paymentPart: {
    hash: 'c'.repeat(56) as Cardano.Credential['hash'],
    type: Cardano.CredentialType.KeyHash,
  },
  type: Cardano.AddressType.RewardKey,
}).toBech32() as Cardano.RewardAccount;

const PREV_TX_ID = Cardano.TransactionId(
  '39a7a284c2a0948189dc45dec670211cd4d72f7b66c5726c08d9b3df11e44d58',
);
const FOREIGN_TX_ID = Cardano.TransactionId(
  '4c4e67bafa15e742c13c592b65c8f74c769cd7d9af04c848099672d1ba391b49',
);
const ASSET_A = Cardano.AssetId(
  'b0d07d45fe9514f80213f4020e5a61241458be626841cde717cb38a76e75746f6b656e31',
);
const ASSET_B = Cardano.AssetId(
  'c0d07d45fe9514f80213f4020e5a61241458be626841cde717cb38a76e75746f6b656e32',
);

const utxo = ({
  txId,
  index,
  address,
  value,
}: {
  txId: Cardano.TransactionId;
  index: number;
  address: Cardano.PaymentAddress;
  value: Cardano.Value;
}): Cardano.Utxo => [
  { address, index, txId },
  { address, value },
];

const serialize = (
  body: Cardano.TxBody,
  witness: Cardano.Witness = { signatures: new Map() },
): HexBytes =>
  HexBytes(
    Serialization.Transaction.fromCore({
      body,
      id: Cardano.TransactionId('0'.repeat(64)),
      witness,
    }).toCbor(),
  );

const inspect = (
  body: Cardano.TxBody,
  accountUtxos: readonly Cardano.Utxo[],
  witness?: Cardano.Witness,
) =>
  inspectCardanoTxEffects({
    accountAddresses: [OWN_ACCOUNT_ADDRESS],
    accountUtxos,
    serializedTx: serialize(body, witness),
  });

describe('inspectCardanoTxEffects', () => {
  it('nets own outputs against own resolved inputs, per token', () => {
    const ownUtxo = utxo({
      address: OWN_ADDRESS,
      index: 0,
      txId: PREV_TX_ID,
      value: {
        assets: new Map([
          [ASSET_A, 100n],
          [ASSET_B, 7n],
        ]),
        coins: 10_000_000n,
      },
    });

    const effects = inspect(
      {
        fee: 200_000n,
        inputs: [ownUtxo[0]],
        outputs: [
          {
            address: FOREIGN_ADDRESS,
            value: { assets: new Map([[ASSET_A, 100n]]), coins: 3_000_000n },
          },
          {
            address: OWN_ADDRESS,
            value: { assets: new Map([[ASSET_B, 7n]]), coins: 6_800_000n },
          },
        ],
      },
      [ownUtxo],
    );

    // 10 ADA in, 6.8 ADA of change back; ASSET_A left entirely, ASSET_B stayed.
    expect(effects.netByTokenId.get(TokenId('lovelace'))).toBe(-3_200_000n);
    expect(effects.netByTokenId.get(TokenId(ASSET_A))).toBe(-100n);
    expect(effects.netByTokenId.has(TokenId(ASSET_B))).toBe(false);
    expect(effects.fee).toBe(200_000n);
  });

  it('treats an input absent from the account UTxO set as foreign and uncounted', () => {
    const ownUtxo = utxo({
      address: OWN_ADDRESS,
      index: 0,
      txId: PREV_TX_ID,
      value: { coins: 10_000_000n },
    });
    const poolInput = { index: 3, txId: FOREIGN_TX_ID };

    const effects = inspect(
      {
        fee: 200_000n,
        inputs: [ownUtxo[0], poolInput],
        outputs: [{ address: OWN_ADDRESS, value: { coins: 9_800_000n } }],
      },
      [ownUtxo],
    );

    expect(effects.ownInputs).toHaveLength(1);
    expect(effects.unresolvedInputs).toEqual([poolInput]);
    expect(effects.netByTokenId.get(TokenId('lovelace'))).toBe(-200_000n);
    expect(effects.consumedInputs).toHaveLength(2);
  });

  it('flags each output as own and as script', () => {
    const effects = inspect(
      {
        fee: 0n,
        inputs: [],
        outputs: [
          { address: OWN_ADDRESS, value: { coins: 1n } },
          { address: FOREIGN_ADDRESS, value: { coins: 2n } },
          { address: SCRIPT_ADDRESS, value: { coins: 3n } },
        ],
      },
      [],
    );

    expect(
      effects.outputs.map(output => [output.isOwn, output.isScript]),
    ).toEqual([
      [true, false],
      [false, false],
      [false, true],
    ]);
  });

  it('exposes an inline datum as CBOR hex', () => {
    const effects = inspect(
      {
        fee: 0n,
        inputs: [],
        outputs: [
          { address: SCRIPT_ADDRESS, datum: 42n, value: { coins: 3n } },
        ],
      },
      [],
    );

    const [output] = effects.outputs;
    expect(output.hasDatum).toBe(true);
    expect(output.datumCborHex).toBe(
      Serialization.PlutusData.fromCore(42n).toCbor().toString(),
    );
  });

  it('resolves a datum hash against the witness set', () => {
    const datum: Cardano.PlutusData = 7n;
    const serialized = Serialization.PlutusData.fromCore(datum);

    const effects = inspect(
      {
        fee: 0n,
        inputs: [],
        outputs: [
          {
            address: SCRIPT_ADDRESS,
            datumHash: serialized.hash(),
            value: { coins: 3n },
          },
        ],
      },
      [],
      { datums: [datum], signatures: new Map() },
    );

    expect(effects.outputs[0].datumCborHex).toBe(
      serialized.toCbor().toString(),
    );
  });

  it('reports a datum hash the transaction does not carry as unresolved', () => {
    const effects = inspect(
      {
        fee: 0n,
        inputs: [],
        outputs: [
          {
            address: SCRIPT_ADDRESS,
            datumHash: 'b'.repeat(64) as Cardano.TxOut['datumHash'],
            value: { coins: 3n },
          },
        ],
      },
      [],
    );

    expect(effects.outputs[0].hasDatum).toBe(true);
    expect(effects.outputs[0].datumCborHex).toBeUndefined();
  });

  it('surfaces certificates, withdrawals, mint and TTL', () => {
    const effects = inspect(
      {
        certificates: [
          {
            __typename: Cardano.CertificateType.StakeRegistration,
            stakeCredential: {
              hash: 'a'.repeat(56) as Cardano.Credential['hash'],
              type: Cardano.CredentialType.KeyHash,
            },
          },
        ],
        fee: 0n,
        inputs: [],
        mint: new Map([
          [ASSET_A, 1n],
          [ASSET_B, -2n],
        ]),
        outputs: [],
        validityInterval: { invalidHereafter: Cardano.Slot(12_345) },
        withdrawals: [
          {
            quantity: 4_000_000n,
            stakeAddress: REWARD_ACCOUNT,
          },
        ],
      },
      [],
    );

    expect(effects.certificateCount).toBe(1);
    expect(effects.withdrawalTotal).toBe(4_000_000n);
    expect(effects.mint.get(ASSET_A)).toBe(1n);
    expect(effects.mint.get(ASSET_B)).toBe(-2n);
    expect(effects.ttl).toBe(12_345);
  });

  it('reports no governance actions when the body carries none', () => {
    const effects = inspect({ fee: 0n, inputs: [], outputs: [] }, []);

    expect(effects.votingProcedureCount).toBe(0);
    expect(effects.proposalProcedureCount).toBe(0);
  });

  it('counts voting procedures by voter, and the proposals submitted', () => {
    const effects = inspect(
      {
        fee: 0n,
        inputs: [],
        outputs: [],
        proposalProcedures: [
          {
            anchor: {
              dataHash: '0'.repeat(64) as Cardano.Anchor['dataHash'],
              url: 'https://example.invalid/proposal',
            },
            deposit: 100_000_000_000n,
            governanceAction: {
              __typename: Cardano.GovernanceActionType.info_action,
            },
            rewardAccount: REWARD_ACCOUNT,
          },
        ],
        votingProcedures: [
          {
            voter: {
              __typename: Cardano.VoterType.dRepKeyHash,
              credential: {
                hash: 'b'.repeat(56) as Cardano.Credential['hash'],
                type: Cardano.CredentialType.KeyHash,
              },
            },
            // The field answers "who is voting here", which is what a policy
            // asks — so two votes by one voter are still one entry.
            votes: [
              {
                actionId: {
                  actionIndex: 0,
                  id: Cardano.TransactionId('1'.repeat(64)),
                },
                votingProcedure: { anchor: null, vote: Cardano.Vote.yes },
              },
              {
                actionId: {
                  actionIndex: 1,
                  id: Cardano.TransactionId('1'.repeat(64)),
                },
                votingProcedure: { anchor: null, vote: Cardano.Vote.no },
              },
            ],
          },
        ],
      },
      [],
    );

    expect(effects.votingProcedureCount).toBe(1);
    expect(effects.proposalProcedureCount).toBe(1);
  });

  it('totals only the collateral inputs it can resolve as own', () => {
    const ownCollateral = utxo({
      address: OWN_ADDRESS,
      index: 1,
      txId: PREV_TX_ID,
      value: {
        coins: 5_000_000n,
      },
    });

    const effects = inspect(
      {
        collaterals: [ownCollateral[0], { index: 9, txId: FOREIGN_TX_ID }],
        fee: 0n,
        inputs: [],
        outputs: [],
      },
      [ownCollateral],
    );

    expect(effects.ownCollateral.inputs).toHaveLength(1);
    expect(effects.ownCollateral.totalCoin).toBe(5_000_000n);
    expect(effects.ownCollateral.returnedCoin).toBe(0n);
  });

  it('counts a collateral return that pays an own address', () => {
    const ownCollateral = utxo({
      address: OWN_ADDRESS,
      index: 1,
      txId: PREV_TX_ID,
      value: {
        coins: 500_000_000n,
      },
    });

    const effects = inspect(
      {
        collateralReturn: {
          address: OWN_ADDRESS,
          value: { coins: 497_000_000n },
        },
        collaterals: [ownCollateral[0]],
        fee: 0n,
        inputs: [],
        outputs: [],
      },
      [ownCollateral],
    );

    expect(effects.ownCollateral.totalCoin).toBe(500_000_000n);
    expect(effects.ownCollateral.returnedCoin).toBe(497_000_000n);
  });

  it('ignores a collateral return that pays a foreign address', () => {
    const ownCollateral = utxo({
      address: OWN_ADDRESS,
      index: 1,
      txId: PREV_TX_ID,
      value: {
        coins: 500_000_000n,
      },
    });

    const effects = inspect(
      {
        collateralReturn: {
          address: FOREIGN_ADDRESS,
          value: { coins: 497_000_000n },
        },
        collaterals: [ownCollateral[0]],
        fee: 0n,
        inputs: [],
        outputs: [],
      },
      [ownCollateral],
    );

    expect(effects.ownCollateral.returnedCoin).toBe(0n);
  });

  it('omits a token whose net change is zero', () => {
    const ownUtxo = utxo({
      address: OWN_ADDRESS,
      index: 0,
      txId: PREV_TX_ID,
      value: {
        assets: new Map([[ASSET_A, 50n]]),
        coins: 2_000_000n,
      },
    });

    const effects = inspect(
      {
        fee: 0n,
        inputs: [ownUtxo[0]],
        outputs: [
          {
            address: OWN_ADDRESS,
            value: { assets: new Map([[ASSET_A, 50n]]), coins: 2_000_000n },
          },
        ],
      },
      [ownUtxo],
    );

    expect([...effects.netByTokenId.keys()]).toEqual([]);
  });

  it("exposes the account's own payment credential hashes, and not its stake one", () => {
    const effects = inspect({ fee: 0n, inputs: [], outputs: [] }, []);
    const props = Cardano.Address.fromString(OWN_ADDRESS)?.getProps();

    expect([...effects.ownPaymentCredentialHashes]).toEqual([
      props?.paymentPart?.hash.toString(),
    ]);
    // One stake credential covers every address of the account, so a datum
    // naming it says nothing about who the order pays.
    expect([...effects.ownPaymentCredentialHashes]).not.toContain(
      props?.delegationPart?.hash.toString(),
    );
  });

  it('reports no credential hashes for an address it cannot parse', () => {
    const effects = inspectCardanoTxEffects({
      accountAddresses: ['not-an-address' as never],
      accountUtxos: [],
      serializedTx: serialize({ fee: 0n, inputs: [], outputs: [] }),
    });

    expect(effects.ownPaymentCredentialHashes.size).toBe(0);
  });

  describe('the cost of describing outputs', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    const withInlineDatum = (): Cardano.TxBody => ({
      fee: 0n,
      inputs: [],
      outputs: [
        { address: SCRIPT_ADDRESS, datum: 42n, value: { coins: 3n } },
        { address: SCRIPT_ADDRESS, datum: 43n, value: { coins: 4n } },
      ],
    });

    // Serialized up front: building the fixture itself serializes its inline
    // datums, which would land on the spy and hide what the decode did.
    const inspectPreSerialized = (serializedTx: HexBytes) =>
      inspectCardanoTxEffects({
        accountAddresses: [OWN_ACCOUNT_ADDRESS],
        accountUtxos: [],
        serializedTx,
      });

    it('does not serialize a datum when no caller reads one', () => {
      const serialized = serialize(withInlineDatum());
      const fromCore = vi.spyOn(Serialization.PlutusData, 'fromCore');

      const effects = inspectPreSerialized(serialized);
      // The value-level view the pending-activity path consumes.
      expect(effects.netByTokenId.size).toBe(0);
      expect(effects.producedOutputs).toHaveLength(2);
      expect(effects.outputs.map(output => output.coin)).toEqual([3n, 4n]);

      expect(fromCore).not.toHaveBeenCalled();
    });

    it('parses one address per isScript read, once each, and none unread', () => {
      const serialized = serialize(withInlineDatum());
      const fromString = vi.spyOn(Cardano.Address, 'fromString');

      const effects = inspectPreSerialized(serialized);
      expect(effects.outputs.map(output => output.isOwn)).toEqual([
        false,
        false,
      ]);
      const afterDecode = fromString.mock.calls.length;

      expect(effects.outputs[0].isScript).toBe(true);
      expect(fromString).toHaveBeenCalledTimes(afterDecode + 1);

      // Re-reading is cached, and the output nobody asked about is untouched.
      expect(effects.outputs[0].isScript).toBe(true);
      expect(fromString).toHaveBeenCalledTimes(afterDecode + 1);

      expect(effects.outputs[1].isScript).toBe(true);
      expect(fromString).toHaveBeenCalledTimes(afterDecode + 2);
    });

    it('serializes a datum once however often it is read', () => {
      const serialized = serialize(withInlineDatum());
      const expected = Serialization.PlutusData.fromCore(42n)
        .toCbor()
        .toString();
      const fromCore = vi.spyOn(Serialization.PlutusData, 'fromCore');

      const effects = inspectPreSerialized(serialized);
      expect(effects.outputs[0].datumCborHex).toBe(expected);
      expect(fromCore).toHaveBeenCalledTimes(1);

      expect(effects.outputs[0].datumCborHex).toBe(expected);
      expect(fromCore).toHaveBeenCalledTimes(1);
    });
  });

  it('throws when the bytes are not a transaction', () => {
    expect(() =>
      inspectCardanoTxEffects({
        accountAddresses: [OWN_ACCOUNT_ADDRESS],
        accountUtxos: [],
        serializedTx: HexBytes('deadbeef'),
      }),
    ).toThrow();
  });

  describe('native assets pledged as collateral', () => {
    const withAssets = (index: number, assets: Cardano.Value['assets']) =>
      utxo({
        address: OWN_ADDRESS,
        index: index,
        txId: PREV_TX_ID,
        value: { assets, coins: 2_000_000n },
      });
    const pledge = ({
      collateralUtxos,
      collateralReturn,
    }: {
      collateralUtxos: readonly Cardano.Utxo[];
      collateralReturn?: Cardano.TxOut;
    }) =>
      inspect(
        {
          collateralReturn,
          collaterals: collateralUtxos.map(([txIn]) => txIn),
          fee: 0n,
          inputs: [],
          outputs: [],
        },
        collateralUtxos,
      );

    it('sums one asset across several collateral inputs', () => {
      const effects = pledge({
        collateralUtxos: [
          withAssets(0, new Map([[ASSET_A, 3n]])),
          withAssets(1, new Map([[ASSET_A, 4n]])),
        ],
      });

      expect([...effects.ownCollateral.assetsAtRisk]).toEqual([[ASSET_A, 7n]]);
    });

    it('treats an absent return as forfeiting the whole pledge', () => {
      const effects = pledge({
        collateralUtxos: [withAssets(0, new Map([[ASSET_A, 3n]]))],
      });

      expect(effects.ownCollateral.assetsAtRisk.get(ASSET_A)).toBe(3n);
    });

    it('nets off only the part a return pays back to an own address', () => {
      const effects = pledge({
        collateralReturn: {
          address: OWN_ADDRESS,
          value: { assets: new Map([[ASSET_A, 2n]]), coins: 1n },
        },
        collateralUtxos: [withAssets(0, new Map([[ASSET_A, 5n]]))],
      });

      expect(effects.ownCollateral.assetsAtRisk.get(ASSET_A)).toBe(3n);
    });

    it('leaves nothing at risk when a return pays back more than was pledged', () => {
      const effects = pledge({
        collateralReturn: {
          address: OWN_ADDRESS,
          value: { assets: new Map([[ASSET_A, 9n]]), coins: 1n },
        },
        collateralUtxos: [withAssets(0, new Map([[ASSET_A, 5n]]))],
      });

      // Clamped, not negative: a foreign pledge may share the return.
      expect(effects.ownCollateral.assetsAtRisk.size).toBe(0);
    });

    it('does not invent an entry for an asset the pledge never held', () => {
      const effects = pledge({
        collateralReturn: {
          address: OWN_ADDRESS,
          value: { assets: new Map([[ASSET_B, 4n]]), coins: 1n },
        },
        collateralUtxos: [withAssets(0, new Map([[ASSET_A, 5n]]))],
      });

      expect([...effects.ownCollateral.assetsAtRisk]).toEqual([[ASSET_A, 5n]]);
    });

    it('counts nothing for a collateral input it does not resolve as own', () => {
      const foreign = utxo({
        address: FOREIGN_ADDRESS,
        index: 7,
        txId: FOREIGN_TX_ID,
        value: {
          assets: new Map([[ASSET_A, 5n]]),
          coins: 2_000_000n,
        },
      });
      // Resolved against an empty own set, so the input is foreign to us.
      const effects = inspect(
        { collaterals: [foreign[0]], fee: 0n, inputs: [], outputs: [] },
        [],
      );

      expect(effects.ownCollateral.assetsAtRisk.size).toBe(0);
      expect(effects.ownCollateral.totalCoin).toBe(0n);
    });

    it('ignores a return that pays an address this account does not own', () => {
      const effects = pledge({
        collateralReturn: {
          address: FOREIGN_ADDRESS,
          value: { assets: new Map([[ASSET_A, 5n]]), coins: 1n },
        },
        collateralUtxos: [withAssets(0, new Map([[ASSET_A, 5n]]))],
      });

      expect(effects.ownCollateral.assetsAtRisk.get(ASSET_A)).toBe(5n);
    });
  });
});
