import {
  Cardano,
  InvalidProtocolParametersError,
  Serialization,
} from '@lace-lib/cardano-core';
import * as Crypto from '@lace-lib/cardano-crypto';
import { AssetId } from '@lace-lib/cardano-util-dev';
import { HexBlob } from '@lace-lib/util/common';

import { defaultSelectionConstraints } from '../../src';
import { babbageTx, getBigBabbageTx } from '../testData';
import { mockTxEvaluator } from '../tx-builder/mocks';

import type { DefaultSelectionConstraintsProps } from '../../src';
import type {
  ProtocolParametersForInputSelection,
  SelectionSkeleton,
} from '@lace-lib/cardano-input-selection';

describe('defaultSelectionConstraints', () => {
  const protocolParameters = {
    coinsPerUtxoByte: 4310,
    maxTxSize: 16_384,
    maxValueSize: 5000,
    minFeeCoefficient: 44,
    minFeeConstant: 155_381,
    prices: { memory: 0.0577, steps: 0.000_007_21 },
  } as ProtocolParametersForInputSelection;

  it('Invalid parameters', () => {
    for (const param of [
      'minFeeCoefficient',
      'minFeeConstant',
      'coinsPerUtxoByte',
      'maxTxSize',
      'maxValueSize',
    ]) {
      expect(() =>
        defaultSelectionConstraints({
          protocolParameters: { ...protocolParameters, [param]: null },
        } as DefaultSelectionConstraintsProps),
      ).toThrowError(InvalidProtocolParametersError);
    }
  });

  it('computeMinimumCost (fee reflects default tag 258 sets and map redeemers)', async () => {
    const fee = 219_677n;
    const buildTx = vi.fn(async () => babbageTx);
    const selectionSkeleton = { inputs: [] } as unknown as SelectionSkeleton;
    const constraints = defaultSelectionConstraints({
      buildTx,
      protocolParameters,
      redeemersByType: {
        certificate: [
          {
            data: Serialization.PlutusData.fromCbor(
              HexBlob('d86682008102'),
            ).toCore(),
            executionUnits: {
              memory: 0,
              steps: 0,
            },
            index: 1,
            purpose: Cardano.RedeemerPurpose.certificate,
          },
        ],
        // Keyed by a policy id present in babbageTx's mint; it sorts first canonically -> index 0.
        mint: new Map([
          [
            Cardano.PolicyId(
              '2a286ad895d091f2b3d168a6091ad2627d30a72761a5bc36eef00740',
            ),
            {
              data: Serialization.PlutusData.fromCbor(
                HexBlob('d86682008101'),
              ).toCore(),
              executionUnits: {
                memory: 0,
                steps: 0,
              },
              index: 0,
              purpose: Cardano.RedeemerPurpose.mint,
            },
          ],
        ]),
      },
      txEvaluator: mockTxEvaluator,
    });

    const result = await constraints.computeMinimumCost(selectionSkeleton);
    expect(result).toEqual({
      fee,
      redeemers: [
        {
          data: Serialization.PlutusData.fromCbor(
            HexBlob('d86682008101'),
          ).toCore(),
          executionUnits: {
            memory: 100,
            steps: 200,
          },
          index: 0,
          purpose: Cardano.RedeemerPurpose.mint,
        },
        {
          data: Serialization.PlutusData.fromCbor(
            HexBlob('d86682008102'),
          ).toCore(),
          executionUnits: {
            memory: 100,
            steps: 200,
          },
          index: 1,
          purpose: Cardano.RedeemerPurpose.certificate,
        },
      ],
    });
    expect(buildTx).toBeCalledTimes(1);
    expect(buildTx).toBeCalledWith(selectionSkeleton);
  });

  it('computeMinimumCoinQuantity', () => {
    const assets = new Map([
      [AssetId.TSLA, 5000n],
      [AssetId.PXL, 3000n],
    ]);
    const constraints = defaultSelectionConstraints({
      protocolParameters,
    } as DefaultSelectionConstraintsProps);
    const address = Cardano.PaymentAddress(
      'addr_test1qqydn46r6mhge0kfpqmt36m6q43knzsd9ga32n96m89px3nuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475qypp3m9',
    );
    const minCoinWithAssets = constraints.computeMinimumCoinQuantity({
      address,
      value: { assets, coins: 0n },
    });
    const minCoinWithoutAssets = constraints.computeMinimumCoinQuantity({
      address,
      value: { coins: 0n },
    });
    expect(typeof minCoinWithAssets).toBe('bigint');
    expect(typeof minCoinWithoutAssets).toBe('bigint');
    expect(minCoinWithAssets).toBeGreaterThan(minCoinWithoutAssets);
  });

  describe('computeSelectionLimit', () => {
    it("doesn't exceed max tx size", async () => {
      const constraints = defaultSelectionConstraints({
        buildTx: async () => babbageTx,
        protocolParameters,
        redeemersByType: {},
        txEvaluator: mockTxEvaluator,
      });
      expect(
        await constraints.computeSelectionLimit({
          inputs: new Set([1, 2]) as any,
        } as SelectionSkeleton),
      ).toEqual(2);
    });

    it('exceeds max tx size', async () => {
      const constraints = defaultSelectionConstraints({
        buildTx: getBigBabbageTx,
        protocolParameters,
        redeemersByType: {},
        txEvaluator: mockTxEvaluator,
      });
      expect(
        await constraints.computeSelectionLimit({
          inputs: new Set([1, 2]) as any,
        } as SelectionSkeleton),
      ).toEqual(1);
    });
  });

  describe('tokenBundleSizeExceedsLimit', () => {
    it('empty bundle', () => {
      const constraints = defaultSelectionConstraints({
        buildTx: vi.fn(),
        protocolParameters,
        redeemersByType: {},
        txEvaluator: mockTxEvaluator,
      });
      expect(constraints.tokenBundleSizeExceedsLimit()).toBe(false);
    });

    it("doesn't exceed max value size", () => {
      const constraints = defaultSelectionConstraints({
        protocolParameters: {
          ...protocolParameters,
          maxValueSize: 1_000_000_000,
        },
      } as DefaultSelectionConstraintsProps);
      expect(constraints.tokenBundleSizeExceedsLimit(new Map())).toBe(false);
    });

    it('exceeds max value size', () => {
      const constraints = defaultSelectionConstraints({
        protocolParameters: { ...protocolParameters, maxValueSize: 1 },
      } as DefaultSelectionConstraintsProps);
      expect(constraints.tokenBundleSizeExceedsLimit(new Map())).toBe(true);
    });
  });

  describe('canonical redeemer indices', () => {
    const selection = { inputs: [] } as unknown as SelectionSkeleton;
    const maxBudget = { memory: 100, steps: 200 };
    const dataA = Serialization.PlutusData.fromCbor(HexBlob('d87980')).toCore();
    const dataB = Serialization.PlutusData.fromCbor(HexBlob('d87a80')).toCore();

    const scriptRewardAccount = (hashByte: string) =>
      Cardano.RewardAccount.fromCredential(
        {
          hash: Crypto.Hash28ByteBase16(hashByte.repeat(28)),
          type: Cardano.CredentialType.ScriptHash,
        },
        Cardano.NetworkId.Testnet,
      );
    const keyRewardAccount = (hashByte: string) =>
      Cardano.RewardAccount.fromCredential(
        {
          hash: Crypto.Hash28ByteBase16(hashByte.repeat(28)),
          type: Cardano.CredentialType.KeyHash,
        },
        Cardano.NetworkId.Testnet,
      );

    it('withdrawal redeemers are indexed among script reward accounts by hash, excluding key-hash withdrawals', async () => {
      const scriptA = scriptRewardAccount('aa');
      const scriptB = scriptRewardAccount('bb');
      const keyC = keyRewardAccount('cc');

      const redeemer = (data: Cardano.PlutusData): Cardano.Redeemer => ({
        data,
        executionUnits: { memory: 0, steps: 0 },
        index: Number.MAX_SAFE_INTEGER,
        purpose: Cardano.RedeemerPurpose.withdrawal,
      });

      // Body lists them out of canonical order, and a key-hash withdrawal is interleaved.
      const tx = {
        ...babbageTx,
        body: {
          ...babbageTx.body,
          mint: undefined,
          withdrawals: [
            { quantity: 1n, stakeAddress: keyC },
            { quantity: 1n, stakeAddress: scriptB },
            { quantity: 1n, stakeAddress: scriptA },
          ],
        },
        witness: {
          ...babbageTx.witness,
          redeemers: [redeemer(dataA), redeemer(dataB)],
        },
      } as Cardano.Tx;

      const constraints = defaultSelectionConstraints({
        buildTx: async () => tx,
        protocolParameters,
        redeemersByType: {
          withdrawal: new Map([
            [scriptB, redeemer(dataB)],
            [scriptA, redeemer(dataA)],
          ]),
        },
        txEvaluator: mockTxEvaluator,
      } as DefaultSelectionConstraintsProps);

      const { redeemers } = await constraints.computeMinimumCost(selection);

      // scriptA (aa) sorts before scriptB (bb); the key-hash withdrawal carries no redeemer.
      expect(redeemers!.find(r => r.data === dataA)!.index).toBe(0);
      expect(redeemers!.find(r => r.data === dataB)!.index).toBe(1);
      expect(
        redeemers!.every(r => r.executionUnits.steps === maxBudget.steps),
      ).toBe(true);
    });

    it('vote redeemers are indexed by the ledger order of voters: committee, DRep, pool; script before key; then by hash', async () => {
      const hash = (byte: string) => Crypto.Hash28ByteBase16(byte.repeat(28));
      const poolVoter: Cardano.Voter = {
        __typename: Cardano.VoterType.stakePoolKeyHash,
        credential: { hash: hash('aa'), type: Cardano.CredentialType.KeyHash },
      };
      const drepKeyVoter: Cardano.Voter = {
        __typename: Cardano.VoterType.dRepKeyHash,
        credential: { hash: hash('bb'), type: Cardano.CredentialType.KeyHash },
      };
      const drepScriptVoter: Cardano.Voter = {
        __typename: Cardano.VoterType.dRepScriptHash,
        credential: {
          hash: hash('cc'),
          type: Cardano.CredentialType.ScriptHash,
        },
      };
      const committeeVoter: Cardano.Voter = {
        __typename: Cardano.VoterType.ccHotKeyHash,
        credential: { hash: hash('dd'), type: Cardano.CredentialType.KeyHash },
      };
      const vote = {
        actionId: {
          actionIndex: 0,
          id: Cardano.TransactionId(
            '0f3abbc8fc19c2e61bab6059bf8a466e6e754833a08a62a6c56fe0e78f19d9d5',
          ),
        },
        votingProcedure: { anchor: null, vote: Cardano.Vote.yes },
      };
      const redeemer = (data: Cardano.PlutusData): Cardano.Redeemer => ({
        data,
        executionUnits: { memory: 0, steps: 0 },
        index: Number.MAX_SAFE_INTEGER,
        purpose: Cardano.RedeemerPurpose.vote,
      });

      // Listed in the body in reverse of the canonical order.
      const tx = {
        ...babbageTx,
        body: {
          ...babbageTx.body,
          mint: undefined,
          votingProcedures: [
            { voter: poolVoter, votes: [vote] },
            { voter: drepKeyVoter, votes: [vote] },
            { voter: drepScriptVoter, votes: [vote] },
            { voter: committeeVoter, votes: [vote] },
          ],
        },
        witness: {
          ...babbageTx.witness,
          redeemers: [redeemer(dataA), redeemer(dataB)],
        },
      } as Cardano.Tx;

      const constraints = defaultSelectionConstraints({
        buildTx: async () => tx,
        protocolParameters,
        redeemersByType: {
          vote: [
            { redeemer: redeemer(dataA), voter: drepKeyVoter },
            { redeemer: redeemer(dataB), voter: drepScriptVoter },
          ],
        },
        txEvaluator: mockTxEvaluator,
      } as DefaultSelectionConstraintsProps);

      const { redeemers } = await constraints.computeMinimumCost(selection);

      // Canonical: committee (0), DRep script (1), DRep key (2), pool (3).
      expect(redeemers!.find(r => r.data === dataB)!.index).toBe(1);
      expect(redeemers!.find(r => r.data === dataA)!.index).toBe(2);
    });

    it('a vote redeemer whose voter is not in the body is rejected', async () => {
      const tx = {
        ...babbageTx,
        body: { ...babbageTx.body, mint: undefined },
      } as Cardano.Tx;
      const constraints = defaultSelectionConstraints({
        buildTx: async () => tx,
        protocolParameters,
        redeemersByType: {
          vote: [
            {
              redeemer: {
                data: dataA,
                executionUnits: { memory: 0, steps: 0 },
                index: 0,
                purpose: Cardano.RedeemerPurpose.vote,
              },
              voter: {
                __typename: Cardano.VoterType.dRepKeyHash,
                credential: {
                  hash: Crypto.Hash28ByteBase16('ee'.repeat(28)),
                  type: Cardano.CredentialType.KeyHash,
                },
              },
            },
          ],
        },
        txEvaluator: mockTxEvaluator,
      } as DefaultSelectionConstraintsProps);
      await expect(constraints.computeMinimumCost(selection)).rejects.toThrow(
        'Vote redeemer voter not present',
      );
    });
  });
});
