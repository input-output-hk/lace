import { Cardano, ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { Err, Ok } from '@lace-lib/util';
import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';
import { firstValueFrom, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { countScriptUtxos$ } from '../../../src/store/helpers/count-script-utxos';

import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { CardanoProvider } from '@lace-contract/cardano-context';

const chainId = Cardano.ChainIds.Preprod;
const STAKE_A =
  'stake_test1up7pvfq8zn4quy45r2g572290p9vf99mr9tn7r9xrgy2l2qdsf58d';
const STAKE_B =
  'stake_test1uq7g7kqeucnqfweqzgxk3dw34e8zg4swnc7nagysug2mm4cm77jrx';
const PAY_A =
  'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz';
// Script payment credential under STAKE_A, the resting-DEX-order shape.
const PAY_SCRIPT =
  'addr_test1zqwk0nt6a2hdae87w0k240nuezf2fra52qgemksdm4m0jftuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q5jdz53';

const address = (rewardAccount: string): GroupedAddress =>
  ({
    address: Cardano.PaymentAddress(PAY_A),
    rewardAccount: Cardano.RewardAccount(rewardAccount),
    accountIndex: 0,
    index: 0,
    networkId: chainId.networkId,
    type: 0,
  } as unknown as GroupedAddress);

const utxo = (paymentAddress: string): Cardano.Utxo =>
  [
    {},
    { address: Cardano.PaymentAddress(paymentAddress) },
  ] as unknown as Cardano.Utxo;

const providerReturning = (
  utxosByStake: Record<string, Cardano.Utxo[]>,
): CardanoProvider =>
  ({
    getAccountUtxos: vi.fn(({ rewardAccount }: { rewardAccount: string }) =>
      of(Ok(utxosByStake[rewardAccount] ?? [])),
    ),
  } as unknown as CardanoProvider);

/**
 * Fails the first fetch for one stake key with a retriable error, then answers
 * normally. Stateful on purpose: every stub here returns a cold `of(...)`, which
 * replays on re-subscription, so a stub that always fails cannot tell a retry
 * that re-issued the request from one that only re-read a settled result.
 */
const providerFailingFirstFetch = (
  utxosByStake: Record<string, Cardano.Utxo[]>,
  failFor: string,
): CardanoProvider => {
  let hasFailed = false;
  return {
    getAccountUtxos: vi.fn(({ rewardAccount }: { rewardAccount: string }) => {
      if (rewardAccount === failFor && !hasFailed) {
        hasFailed = true;
        return of(Err(new ProviderError(ProviderFailure.ServerUnavailable)));
      }
      return of(Ok(utxosByStake[rewardAccount] ?? []));
    }),
  } as unknown as CardanoProvider;
};

describe('countScriptUtxos$', () => {
  it('counts a script-credential UTxO under the account stake key', async () => {
    const count = await firstValueFrom(
      countScriptUtxos$(
        [address(STAKE_A)],
        chainId,
        providerReturning({ [STAKE_A]: [utxo(PAY_SCRIPT)] }),
      ),
    );

    expect(count).toBe(1);
  });

  it('ignores a key-hash UTxO, which the pre-submit signing guard already rejects', async () => {
    const count = await firstValueFrom(
      countScriptUtxos$(
        [address(STAKE_A)],
        chainId,
        providerReturning({ [STAKE_A]: [utxo(PAY_A)] }),
      ),
    );

    expect(count).toBe(0);
  });

  it('sums across every stake key of the account', async () => {
    const count = await firstValueFrom(
      countScriptUtxos$(
        [address(STAKE_A), address(STAKE_B)],
        chainId,
        providerReturning({
          [STAKE_A]: [utxo(PAY_SCRIPT)],
          [STAKE_B]: [utxo(PAY_SCRIPT), utxo(PAY_A)],
        }),
      ),
    );

    expect(count).toBe(2);
  });

  it('returns 0 without calling the provider when the account has no stake key', async () => {
    const cardanoProvider = providerReturning({});

    const count = await firstValueFrom(
      countScriptUtxos$([], chainId, cardanoProvider),
    );

    expect(count).toBe(0);
    expect(cardanoProvider.getAccountUtxos).not.toHaveBeenCalled();
  });

  // A swallowed failure and a genuine zero render as the same absent row, and
  // the row only appears when the count is nonzero — so degrading to 0 read as
  // an all-clear on the screen that then tells the user to treat the old phrase
  // as compromised. These assert the failure now reaches run-discovery.
  it('errors on a persistent provider error instead of reporting zero', async () => {
    const cardanoProvider = {
      getAccountUtxos: vi.fn(() =>
        of(Err(new ProviderError(ProviderFailure.Unhealthy))),
      ),
    } as unknown as CardanoProvider;

    await expect(
      firstValueFrom(
        countScriptUtxos$([address(STAKE_A)], chainId, cardanoProvider),
      ),
    ).rejects.toBeInstanceOf(ProviderError);
    // Every configured attempt must reach the provider: a retry that only
    // re-subscribed would leave this at 1 while burning the same backoff.
    const { maxRetries } = PROVIDER_REQUEST_RETRY_CONFIG;
    expect(maxRetries).toBeDefined();
    expect(cardanoProvider.getAccountUtxos).toHaveBeenCalledTimes(
      (maxRetries ?? 0) + 1,
    );
  });

  it('errors when the provider observable itself errors', async () => {
    const cardanoProvider = {
      getAccountUtxos: vi.fn(() =>
        throwError(() => new Error('transport failed')),
      ),
    } as unknown as CardanoProvider;

    await expect(
      firstValueFrom(
        countScriptUtxos$([address(STAKE_A)], chainId, cardanoProvider),
      ),
    ).rejects.toThrow('transport failed');
  });

  // A stake address the chain has never seen 404s. That is an answer, not a
  // failure, and must not fail an otherwise healthy migration.
  it('counts a never-seen stake address as zero rather than erroring', async () => {
    const cardanoProvider = {
      getAccountUtxos: vi.fn(() =>
        of(Err(new ProviderError(ProviderFailure.NotFound))),
      ),
    } as unknown as CardanoProvider;

    await expect(
      firstValueFrom(
        countScriptUtxos$([address(STAKE_A)], chainId, cardanoProvider),
      ),
    ).resolves.toBe(0);
    expect(cardanoProvider.getAccountUtxos).toHaveBeenCalledTimes(1);
  });

  it('re-issues the fetch after a transient provider failure and counts the later success', async () => {
    const cardanoProvider = providerFailingFirstFetch(
      { [STAKE_A]: [utxo(PAY_SCRIPT)] },
      STAKE_A,
    );

    await expect(
      firstValueFrom(
        countScriptUtxos$([address(STAKE_A)], chainId, cardanoProvider),
      ),
    ).resolves.toBe(1);
    expect(cardanoProvider.getAccountUtxos).toHaveBeenCalledTimes(2);
  });

  it('still sums across every stake key when one of them needs a retry', async () => {
    const cardanoProvider = providerFailingFirstFetch(
      {
        [STAKE_A]: [utxo(PAY_SCRIPT)],
        [STAKE_B]: [utxo(PAY_SCRIPT), utxo(PAY_A)],
      },
      STAKE_B,
    );

    await expect(
      firstValueFrom(
        countScriptUtxos$(
          [address(STAKE_A), address(STAKE_B)],
          chainId,
          cardanoProvider,
        ),
      ),
    ).resolves.toBe(2);
  });
});
