import { Cardano } from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';
import { ActivityType } from '@lace-contract/activities';
import { AccountId } from '@lace-contract/wallet-repo';
import { Timestamp } from '@lace-sdk/util';
import { firstValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getTransactionData } from '../../../src/store/helpers/get-transaction-summary-data';
import { inputOutputTransformer } from '../../../src/store/helpers/input-output-transform';
import {
  cardanoMetadatumToObject,
  transactionMetadataTransformer,
  type MapActivityToActivityDetailsParams,
  mapTransactionToActivityDetails,
} from '../../../src/store/helpers/map-transaction-to-activity-details';
import {
  createTransactionInspector,
  fetchAssetsMetadata,
} from '../../../src/store/helpers/transaction-inspectors';

import type { BuildCardanoTransactionParams } from '../../../src/store/helpers/map-transaction-to-activity-details';
import type {
  CardanoTokenMetadata,
  ExtendedTxDetails,
  TxOutputInput,
} from '../../../src/types';
import type {
  AssetInfoWithAmount,
  MetadataInspection,
  TransactionSummaryInspection,
} from '@cardano-sdk/core';
import type { Activity } from '@lace-contract/activities';
import type { TokenMetadata } from '@lace-contract/tokens';

vi.mock(import('../../../src/store/helpers/transaction-inspectors'));
vi.mock(import('../../../src/store/helpers/input-output-transform'));
vi.mock(import('../../../src/store/helpers/get-transaction-summary-data'));

describe('cardanoMetadatumToObject', () => {
  it('should return string as-is', () => {
    const result = cardanoMetadatumToObject('test string');
    expect(result).toBe('test string');
  });

  it('should convert bigint to string', () => {
    const result = cardanoMetadatumToObject(123456789n);
    expect(result).toBe('123456789');
  });

  it('should convert Map to array of objects', () => {
    const map = new Map<string, Cardano.Metadatum>([
      ['key1', 'value1'],
      ['key2', 42n],
    ]);
    const result = cardanoMetadatumToObject(map);
    expect(result).toEqual([{ key1: 'value1' }, { key2: '42' }]);
  });

  it('should convert array recursively', () => {
    const array = ['string', 123n, new Map([['nested', 'value']])];
    const result = cardanoMetadatumToObject(array);
    expect(result).toEqual(['string', '123', [{ nested: 'value' }]]);
  });

  it('should convert Buffer to decoded string', () => {
    const buffer = Buffer.from('hello world', 'utf8');
    const result = cardanoMetadatumToObject(buffer);
    expect(result).toBe('hello world');
  });

  it('should handle invalid UTF-8 byte sequences gracefully', () => {
    // Create a buffer with invalid UTF-8 sequence (0xFF 0xFE is not valid UTF-8)
    const invalidUtf8Buffer = Buffer.from([0xff, 0xfe, 0x00, 0x01]);
    const result = cardanoMetadatumToObject(invalidUtf8Buffer);
    expect(result).toBe('[Invalid UTF-8: 4 bytes]');
  });

  it('should handle empty buffer with invalid UTF-8', () => {
    const emptyBuffer = Buffer.from([]);
    const result = cardanoMetadatumToObject(emptyBuffer);
    expect(result).toBe(''); // Empty buffer should decode to empty string
  });

  it('should handle partial UTF-8 sequence', () => {
    // Create a buffer with incomplete UTF-8 sequence (0xC2 without following byte)
    const partialUtf8Buffer = Buffer.from([0xc2]);
    const result = cardanoMetadatumToObject(partialUtf8Buffer);
    expect(result).toBe('[Invalid UTF-8: 1 bytes]');
  });

  it('should handle nested Map with object keys', () => {
    const nestedMap = new Map([[new Map([['inner', 'key']]), 'value']]);
    const result = cardanoMetadatumToObject(nestedMap);
    expect(result).toEqual([{ '[Map]': 'value' }]);
  });
});

describe('transactionMetadataTransformer', () => {
  it('should transform metadata Map to array of key-value objects', () => {
    const metadata = new Map<bigint, Cardano.Metadatum>([
      [1n, 'string value'],
      [2n, 123n],
      [3n, new Map([['nested', 'value']])],
    ]);
    const result = transactionMetadataTransformer(metadata);
    expect(result).toEqual([
      { key: '1', value: 'string value' },
      { key: '2', value: '123' },
      { key: '3', value: [{ nested: 'value' }] },
    ]);
  });

  it('should handle empty metadata Map', () => {
    const metadata = new Map<bigint, Cardano.Metadatum>();
    const result = transactionMetadataTransformer(metadata);
    expect(result).toEqual([]);
  });
});

describe('mapTransactionToActivityDetails', () => {
  let mapParams: MapActivityToActivityDetailsParams;

  beforeEach(() => {
    vi.clearAllMocks();
    mapParams = {} as MapActivityToActivityDetailsParams;
  });

  it('Returns error result if fetchAssetsMetadata throws', async () => {
    vi.mocked(createTransactionInspector).mockReturnValue(async () =>
      Promise.resolve({
        summary: {} as TransactionSummaryInspection,
        metadata: {} as MetadataInspection,
      }),
    );

    vi.mocked(fetchAssetsMetadata).mockReturnValue(
      throwError(() => new Error('test error')),
    );

    const result = await firstValueFrom(
      mapTransactionToActivityDetails(mapParams),
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe('test error');
    }
  });

  describe('when mapping transaction to activity details', () => {
    let mockTxDetailsProviderResponse: BuildCardanoTransactionParams['txDetails'];
    let mockTxDetailsProviderResponseWithCertificates: BuildCardanoTransactionParams['txDetails'];
    let mockActivity: Activity;
    let mockTransformedInputOutput: TxOutputInput;
    let mockSummaryInspection: TransactionSummaryInspection;

    beforeEach(() => {
      // Tx details fetched by the provider that will be mapped directly to the result
      mockTxDetailsProviderResponse = {
        auxiliaryData: {
          blob: new Map<bigint, Cardano.Metadatum>([
            [1n, 'string value'],
            [2n, 123n],
            [3n, new Map([['nested', 'value']])],
          ]),
        },
        body: {
          inputs: [],
          fee: 1000000n,
          outputs: ['test-output'] as unknown as Cardano.TxOut[],
          certificates: [
            'test-certificate',
          ] as unknown as Cardano.HydratedCertificate[],
          proposalProcedures: [
            'test-proposal-procedure',
          ] as unknown as Cardano.ProposalProcedure[],
          votingProcedures: [
            'test-voting-procedure',
          ] as unknown as Cardano.VotingProcedures,
        },
      };

      mockTxDetailsProviderResponseWithCertificates = {
        ...mockTxDetailsProviderResponse,
        body: {
          ...mockTxDetailsProviderResponse.body,
          certificates: [
            {
              __typename: Cardano.CertificateType.StakeDeregistration,
              stakeCredential: {
                hash: Crypto.Hash28ByteBase16(
                  '55c7aee5fda2f45de0d4148d4ade76cb53fc711d56b36983c4f70b79',
                ),
                type: 0,
              },
            },
          ],
        },
      };

      // Summary activity used to fetch the details
      mockActivity = {
        accountId: AccountId('account1'),
        activityId: 'test-activity-id',
        timestamp: Timestamp(1719859200000),
        tokenBalanceChanges: [],
        type: ActivityType.Send,
      };

      // Mocked return value for inputOutputTransformer
      mockTransformedInputOutput = {
        addr: 'test-address',
        amount: 1000000n,
        assetList: [],
      };

      // Mocked return value for summary inspector
      mockSummaryInspection = {
        assets: new Map<Cardano.AssetId, AssetInfoWithAmount>(),
        coins: 0n,
        fee: 1000000n,
        deposit: 1000000n,
        returnedDeposit: 2000000n,
        collateral: 0n,
        // resolvedInputs only needs a value so that the mocked inputOutputTransformer is called
        resolvedInputs: [
          'test-input',
        ] as unknown as TransactionSummaryInspection['resolvedInputs'],
        unresolved: {
          inputs: [] satisfies Cardano.TxIn[],
          value: { coins: 0n },
        },
      };

      // inputOutputTransformer is called by buildCardanoTransaction
      // mocking it so I can only check that the returned value is part of the mapped result
      vi.mocked(inputOutputTransformer).mockReturnValue(
        mockTransformedInputOutput,
      );

      vi.mocked(createTransactionInspector).mockReturnValue(async () =>
        Promise.resolve({
          summary: mockSummaryInspection,
          metadata: '',
        }),
      );

      vi.mocked(getTransactionData).mockReturnValue([]);

      // fetchAssetMetadata returns assetInfo for the inputs and outputs.
      // The discovered assetInfos are used by inputOutputTransformer.
      // Since the inputOutputTransformer is mocked entirely, this can be mocked to any valid value because it will be ignored
      vi.mocked(fetchAssetsMetadata).mockReturnValue(
        of(new Map<Cardano.AssetId, TokenMetadata<CardanoTokenMetadata>>()),
      );
    });

    it('returns input activity hydrated with inspector results and fetched metadata', async () => {
      mapParams = {
        ...mapParams,
        activity: mockActivity,
        txDetails: mockTxDetailsProviderResponse as ExtendedTxDetails,
      };

      const result = await firstValueFrom(
        mapTransactionToActivityDetails(mapParams),
      );

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        // All activity properties are part of the mapped result
        const {
          accountId,
          activityId,
          timestamp,
          tokenBalanceChanges,
          type,
          fee,
        } = result.value;
        expect({
          accountId,
          activityId,
          timestamp,
          tokenBalanceChanges,
          type,
          fee,
        }).toEqual({
          ...mockActivity,
          fee: mockSummaryInspection.fee.toString(),
        });

        // Has all cardano properties
        expect(result.value.blockchainSpecific).toEqual({
          // Tx details fetched by the provider that are part of the result
          votingProcedures: mockTxDetailsProviderResponse.body.votingProcedures,
          proposalProcedures:
            mockTxDetailsProviderResponse.body.proposalProcedures,
          certificates: mockTxDetailsProviderResponse.body.certificates,
          addrOutputs: [mockTransformedInputOutput],
          // Summary inspection properties that are mapped to the result
          addrInputs: [mockTransformedInputOutput],
          deposit: mockSummaryInspection.deposit,
          returnedDeposit: mockSummaryInspection.returnedDeposit,
          collateral: mockSummaryInspection.collateral,
          metadata: [
            {
              key: '1',
              value: 'string value',
            },
            {
              key: '2',
              value: '123',
            },
            {
              key: '3',
              value: [
                {
                  nested: 'value',
                },
              ],
            },
          ],
          txSummary: [],
        });
      }

      expect(getTransactionData).toHaveBeenCalledTimes(1);
    });

    it('does not call getTransactionData when transaction has stake deregistration certificate', async () => {
      const mapParamsWithDeregCertificate = {
        ...mapParams,
        activity: mockActivity,
        txDetails:
          mockTxDetailsProviderResponseWithCertificates as ExtendedTxDetails,
      };

      const resultWithCertificates = await firstValueFrom(
        mapTransactionToActivityDetails(mapParamsWithDeregCertificate),
      );

      expect(resultWithCertificates.isOk()).toBe(true);
      expect(getTransactionData).toHaveBeenCalledTimes(0);
    });
  });
});
