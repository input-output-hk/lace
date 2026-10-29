import { toUnshieldedTokenType } from '@lace-contract/midnight-context';
import * as stubData from '@lace-contract/midnight-context/src/stub-data';
import { BigNumber } from '@lace-lib/util';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import {
  constructShieldedTransaction,
  constructUnshieldedTransaction,
  estimatePreparedMidnightFee,
  normalizeMidnightTransfers,
} from '../../src/store/prepare-midnight-tx';
import { buildTxDependencies } from '../../src/store/tx-executor/build-tx';

const { networkId } = stubData;

describe('headless and extension preparation conformance', () => {
  it.each(['shielded', 'unshielded'] as const)(
    'preserves all %s outputs in the same unsigned transaction',
    kind => {
      vi.useFakeTimers({ now: new Date('2026-10-14T00:00:00Z') });
      try {
        const address =
          kind === 'shielded'
            ? stubData.midnightShieldedAddress
            : stubData.midnightUnshieldedAddress;
        const rawIds = ['aa'.repeat(32), 'bb'.repeat(32)];
        const outputs = rawIds.map((raw, index) => ({
          to: address,
          tokenId:
            kind === 'shielded' ? raw : toUnshieldedTokenType(raw, networkId),
          amount: BigInt(index + 2),
        }));
        const transfers = normalizeMidnightTransfers(networkId, kind, outputs);
        const construct =
          kind === 'shielded'
            ? constructShieldedTransaction
            : constructUnshieldedTransaction;
        const headless = construct({ networkId, transfers });
        const extension = buildTxDependencies.buildTransaction({
          networkId,
          nightUtxos: [],
          nightVerifyingKey: '',
          blockchainSpecificSendFlowData: { flowType: 'send' },
          txParams: [
            {
              address,
              tokenTransfers: outputs.map(({ tokenId, amount }) => ({
                normalizedAmount: BigNumber(amount),
                token: {
                  tokenId,
                  metadata: { blockchainSpecific: { kind } },
                },
              })),
            },
          ] as unknown as Parameters<
            typeof buildTxDependencies.buildTransaction
          >[0]['txParams'],
        });
        // Shielded construction samples coin randomness; compare value deltas rather than bytes.
        if (kind === 'shielded') {
          expect(headless.guaranteedOffer?.outputs).toHaveLength(2);
          expect(extension.guaranteedOffer?.deltas).toEqual(
            headless.guaranteedOffer?.deltas,
          );
          expect(headless.guaranteedOffer?.deltas).toEqual(
            new Map([
              [rawIds[0], -2n],
              [rawIds[1], -3n],
            ]),
          );
        } else {
          const headlessIntent = [...headless.intents!.values()][0];
          const extensionIntent = [...extension.intents!.values()][0];
          expect(extensionIntent.guaranteedUnshieldedOffer?.outputs).toEqual(
            headlessIntent.guaranteedUnshieldedOffer?.outputs,
          );
          expect(
            headlessIntent.guaranteedUnshieldedOffer?.outputs,
          ).toHaveLength(2);
          expect(extensionIntent.ttl).toEqual(headlessIntent.ttl);
        }
      } finally {
        vi.useRealTimers();
      }
    },
  );

  it.each([
    {
      isDustDesignation: true,
      dustBalance: 0n,
      areKeysAvailable: true,
      fee: 0n,
    },
    {
      isDustDesignation: true,
      dustBalance: 5n,
      areKeysAvailable: true,
      fee: 2n,
    },
    {
      isDustDesignation: false,
      dustBalance: 0n,
      areKeysAvailable: true,
      fee: 2n,
    },
    {
      isDustDesignation: false,
      dustBalance: 5n,
      areKeysAvailable: false,
      fee: 3n,
    },
  ])('selects the baseline fee branch: %o', async ({ fee, ...options }) => {
    const wallet = {
      estimateTransactionFee: vi.fn(() => of(2n)),
      calculateTransactionFee: vi.fn(() => of(3n)),
    };
    const tx = ledger.Transaction.fromParts(networkId);
    expect(
      await firstValueFrom(estimatePreparedMidnightFee(wallet, tx, options)),
    ).toBe(fee);
    expect(wallet.estimateTransactionFee).toHaveBeenCalledTimes(
      fee === 2n ? 1 : 0,
    );
    expect(wallet.calculateTransactionFee).toHaveBeenCalledTimes(
      fee === 3n ? 1 : 0,
    );
  });
});
