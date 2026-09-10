import { MidnightAccountId } from '@lace-contract/midnight-context';
import { TokenId } from '@lace-contract/tokens';
import { WalletId } from '@lace-contract/wallet-repo';
import { BigNumber, HexBytes } from '@lace-lib/util';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import makeTxExecutor from '../src/exposed-modules/tx-executor-implementation';
import {
  getMidnightSendResult,
  requestMidnightSend,
  requestMidnightSync,
} from '../src/lace-client';

import { NETWORK_ID } from './fixtures';

import type { SideEffectDependencies } from '@lace-contract/module';
import type {
  BuildTxParams,
  ConfirmTxParams,
} from '@lace-contract/tx-executor';
import type { AnyWallet } from '@lace-contract/wallet-repo';

vi.mock('../src/lace-client', () => ({
  requestMidnightSend: vi.fn(),
  getMidnightSendResult: vi.fn(),
  requestMidnightSync: vi.fn(),
}));

const accountId = MidnightAccountId(WalletId('w1'), 0, NETWORK_ID);

const dependencies = {
  logger: { error: vi.fn() },
} as unknown as SideEffectDependencies;

const executor = () => makeTxExecutor()(dependencies, {} as never);

const buildParams = (
  flowType: 'dust-designation' | 'send' = 'send',
): BuildTxParams =>
  ({
    blockchainName: 'Midnight',
    accountId,
    serializedTx: '',
    blockchainSpecificSendFlowData: { flowType },
    txParams: [
      {
        address: 'mn_addr_test1qreceiver',
        tokenTransfers: [
          {
            normalizedAmount: BigNumber(1000n),
            token: {
              tokenId: TokenId('shieldedA'),
              metadata: { blockchainSpecific: { kind: 'shielded' } },
            },
          },
        ],
      },
    ],
  } as unknown as BuildTxParams);

const wallet = {
  walletId: WalletId('w1'),
  accounts: [
    {
      accountId,
      blockchainName: 'Midnight',
      accountType: 'InMemory',
      blockchainSpecific: { accountIndex: 0, networkId: NETWORK_ID },
    },
  ],
} as unknown as AnyWallet;

describe('midnight tx executor — build', () => {
  it('serializes the transfer facts and reports a placeholder 0 DUST fee', async () => {
    const result = await firstValueFrom(executor().buildTx(buildParams()));
    expect(result.success).toBe(true);
    if (!result.success) throw new Error('expected success');
    expect(JSON.parse(HexBytes.toUTF8(HexBytes(result.serializedTx)))).toEqual({
      amount: '1000',
      receiverAddress: 'mn_addr_test1qreceiver',
      type: 'shieldedA',
      tokenKind: 'shielded',
    });
    expect(result.fees[0].tokenId).toBe('dust');
    expect(result.fees[0].amount.toString()).toBe('0');
  });

  it('fails closed for the dust-designation flow (no wire method)', async () => {
    const result = await firstValueFrom(
      executor().buildTx(buildParams('dust-designation')),
    );
    expect(result.success).toBe(false);
  });

  it('fails closed (returns a generic error, never throws) when there are no token transfers', async () => {
    const params = buildParams();
    const result = await firstValueFrom(
      executor().buildTx({
        ...params,
        txParams: [{ ...params.txParams[0], tokenTransfers: [] }],
      } as unknown as BuildTxParams),
    );
    expect(result.success).toBe(false);
    if (result.success) throw new Error('expected failure');
    expect(result.errorTranslationKey).toBe(
      'tx-executor.building-error.generic',
    );
  });

  it('fails closed when the transferred token carries no metadata', async () => {
    const params = buildParams();
    const [{ tokenTransfers }] = params.txParams;
    const result = await firstValueFrom(
      executor().buildTx({
        ...params,
        txParams: [
          {
            ...params.txParams[0],
            tokenTransfers: [
              {
                ...tokenTransfers[0],
                token: { tokenId: TokenId('shieldedA') },
              },
            ],
          },
        ],
      } as unknown as BuildTxParams),
    );
    expect(result.success).toBe(false);
  });
});

describe('midnight tx executor — confirm (host send ceremony)', () => {
  const serializedTx = HexBytes.fromUTF8(
    JSON.stringify({
      amount: '1000',
      receiverAddress: 'mn_addr_test1qreceiver',
      type: 'shieldedA',
      tokenKind: 'shielded',
    }),
  );

  const confirmParams: ConfirmTxParams = {
    blockchainName: 'Midnight',
    accountId,
    wallet,
    serializedTx,
    blockchainSpecificSendFlowData: { flowType: 'send' },
  } as unknown as ConfirmTxParams;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.mocked(requestMidnightSend).mockResolvedValue({
      ok: true,
      value: { ceremonyId: 'c1' },
    });
    vi.mocked(requestMidnightSync).mockResolvedValue({
      ok: true,
      value: { syncId: 's1' },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('requests the send with the resolved account routing and threads the confirmed txId', async () => {
    vi.mocked(getMidnightSendResult)
      .mockResolvedValueOnce({ ok: true, value: { status: 'pending' } })
      .mockResolvedValueOnce({
        ok: true,
        value: { status: 'confirmed', txId: 'txid1' },
      });

    const results: unknown[] = [];
    executor()
      .confirmTx(confirmParams)
      .subscribe(result => results.push(result));

    await vi.advanceTimersByTimeAsync(2000);

    expect(requestMidnightSend).toHaveBeenCalledWith({
      walletId: 'w1',
      accountIndex: 0,
      network: NETWORK_ID,
      amount: '1000',
      receiverAddress: 'mn_addr_test1qreceiver',
      type: 'shieldedA',
      tokenKind: 'shielded',
    });
    expect(results).toEqual([{ serializedTx: 'txid1', success: true }]);
    // Post-send refresh (D8 explicit trigger): one requestSync on the account so
    // the next state poll reflects the sent tx. Warm post-ceremony, so it pokes
    // the host engine rather than prompting.
    expect(requestMidnightSync).toHaveBeenCalledTimes(1);
    expect(requestMidnightSync).toHaveBeenCalledWith({
      walletId: 'w1',
      accountIndex: 0,
      network: NETWORK_ID,
    });
  });

  it('reports a confirmation error when the host reports cancelled', async () => {
    vi.mocked(getMidnightSendResult).mockResolvedValue({
      ok: true,
      value: { status: 'cancelled' },
    });

    const results: Array<{ success: boolean }> = [];
    executor()
      .confirmTx(confirmParams)
      .subscribe(result => results.push(result));

    await vi.advanceTimersByTimeAsync(1500);

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    // No post-send refresh on a non-confirmed outcome.
    expect(requestMidnightSync).not.toHaveBeenCalled();
  });

  it('reports a confirmation error when the host reports failed', async () => {
    vi.mocked(getMidnightSendResult).mockResolvedValue({
      ok: true,
      value: { status: 'failed', reason: 'proving failed' },
    });

    const results: Array<{ success: boolean }> = [];
    executor()
      .confirmTx(confirmParams)
      .subscribe(result => results.push(result));

    await vi.advanceTimersByTimeAsync(1500);

    expect(results[0].success).toBe(false);
    // No post-send refresh on a non-confirmed outcome.
    expect(requestMidnightSync).not.toHaveBeenCalled();
  });

  /** One confirm run against a fixed failure reason, reduced to its result. */
  const confirmWithFailureReason = async (
    reason: string,
  ): Promise<{ errorTranslationKeys?: { subtitle: string } }> => {
    vi.mocked(getMidnightSendResult).mockResolvedValue({
      ok: true,
      value: { status: 'failed', reason },
    });
    const results: { errorTranslationKeys?: { subtitle: string } }[] = [];
    executor()
      .confirmTx(confirmParams)
      .subscribe(result =>
        results.push(result as { errorTranslationKeys?: { subtitle: string } }),
      );
    await vi.advanceTimersByTimeAsync(1500);
    return results[0];
  };

  // The host records the balancer's own message; dropping it left every failed
  // send reading "Confirmation failed" with no cause the user could act on.
  it.each([
    'Insufficient Funds: could not balance dust',
    'Not enough Dust generated to pay the fee',
    'No dust tokens found in the wallet state',
  ])('renders the insufficient-dust cause for %s', async reason => {
    const result = await confirmWithFailureReason(reason);
    expect(result.errorTranslationKeys?.subtitle).toBe(
      'tx-executor.building-error.insufficient-dust',
    );
  });

  it('renders the insufficient-funds cause when the transfer itself cannot be covered', async () => {
    const result = await confirmWithFailureReason(
      'send failed: Insufficient funds for the requested transfer',
    );
    expect(result.errorTranslationKeys?.subtitle).toBe(
      'tx-executor.building-error.insufficient-funds',
    );
  });

  it('falls back to the generic error for an unrecognised reason', async () => {
    const result = await confirmWithFailureReason('proof server 500');
    expect(result.errorTranslationKeys?.subtitle).toBe(
      'tx-executor.confirmation-error.generic.subtitle',
    );
  });

  it('fails immediately on a terminal poll error rather than polling to the ceiling', async () => {
    // 'invalid-params' is the host rejecting the ceremony id itself — every
    // later poll answers the same, so waiting out the 15-minute ceiling only
    // strands the send screen.
    vi.mocked(getMidnightSendResult).mockResolvedValue({
      ok: false,
      error: { code: 'invalid-params', message: 'bad ceremonyId' },
    });

    const results: Array<{ success: boolean }> = [];
    executor()
      .confirmTx(confirmParams)
      .subscribe(result => results.push(result));

    await vi.advanceTimersByTimeAsync(100);

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
  });

  it('fails once the consecutive-error budget is spent on an opaque poll error', async () => {
    // A lost send record ("unknown ceremony") reaches the guest as the
    // catch-all 'internal', indistinguishable from a transient blip by code —
    // the budget is what keeps it off the 15-minute ceiling.
    vi.mocked(getMidnightSendResult).mockResolvedValue({
      ok: false,
      error: { code: 'internal', message: 'method failed' },
    });

    const results: Array<{ success: boolean }> = [];
    executor()
      .confirmTx(confirmParams)
      .subscribe(result => results.push(result));

    await vi.advanceTimersByTimeAsync(5000);
    expect(results).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
  });

  it('keeps polling through a transient poll error and still confirms', async () => {
    vi.mocked(getMidnightSendResult)
      .mockResolvedValueOnce({
        ok: false,
        error: { code: 'timeout', message: 'host busy' },
      })
      .mockResolvedValue({
        ok: true,
        value: { status: 'confirmed', txId: 'txid1' },
      });

    const results: unknown[] = [];
    executor()
      .confirmTx(confirmParams)
      .subscribe(result => results.push(result));

    await vi.advanceTimersByTimeAsync(2000);

    expect(results).toEqual([{ serializedTx: 'txid1', success: true }]);
  });

  it('reports a confirmation error when the host refuses the send request', async () => {
    vi.mocked(requestMidnightSend).mockResolvedValue({
      ok: false,
      error: { code: 'refused', message: 'wallet is not signable' },
    });

    const results: Array<{ success: boolean }> = [];
    executor()
      .confirmTx(confirmParams)
      .subscribe(result => results.push(result));

    await vi.advanceTimersByTimeAsync(0);

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(getMidnightSendResult).not.toHaveBeenCalled();
  });

  it('reports a confirmation error when the wire call itself throws', async () => {
    vi.mocked(requestMidnightSend).mockRejectedValue(new Error('wire down'));

    const results: Array<{ success: boolean }> = [];
    executor()
      .confirmTx(confirmParams)
      .subscribe(result => results.push(result));

    await vi.advanceTimersByTimeAsync(0);

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
  });

  it('reports a confirmation error for an account the wallet does not hold', async () => {
    const results: Array<{ success: boolean }> = [];
    executor()
      .confirmTx({
        ...confirmParams,
        wallet: { ...wallet, accounts: [] } as unknown as AnyWallet,
      })
      .subscribe(result => results.push(result));

    await vi.advanceTimersByTimeAsync(0);

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(requestMidnightSend).not.toHaveBeenCalled();
  });

  it('reports a confirmation error for a malformed serializedTx', async () => {
    const results: Array<{ success: boolean }> = [];
    executor()
      .confirmTx({
        ...confirmParams,
        serializedTx: HexBytes.fromUTF8('not json'),
      })
      .subscribe(result => results.push(result));

    await vi.advanceTimersByTimeAsync(0);

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(requestMidnightSend).not.toHaveBeenCalled();
  });
});

describe('midnight tx executor — submit / preview / discard', () => {
  it('passes the confirmed txId straight through (already submitted host-side)', async () => {
    const result = await firstValueFrom(
      executor().submitTx({
        blockchainName: 'Midnight',
        accountId,
        serializedTx: 'txid1',
        blockchainSpecificSendFlowData: { flowType: 'send' },
      } as never),
    );
    expect(result).toEqual({ success: true, txId: 'txid1' });
  });

  it('previews with a minimum amount and discards successfully', async () => {
    const preview = await firstValueFrom(executor().previewTx(buildParams()));
    expect(preview.success).toBe(true);
    const discard = await firstValueFrom(
      executor().discardTx({
        blockchainName: 'Midnight',
        serializedTx: 'x',
      } as never),
    );
    expect(discard.success).toBe(true);
  });
});
