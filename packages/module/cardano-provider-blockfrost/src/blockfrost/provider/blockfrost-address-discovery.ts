/* eslint-disable max-params */

import { AddressType, KeyRole } from '@cardano-sdk/key-management';
import { CardanoRewardAccount } from '@lace-contract/cardano-context';
import { isNotFoundError } from '@lace-lib/util-provider';
import { ProviderError, ProviderFailure } from '@lace-lib/util-provider';
import { Err, Ok, type Result } from '@lace-sdk/util';
import {
  from,
  distinct,
  forkJoin,
  Observable,
  map,
  catchError,
  of,
  toArray,
  mergeMap,
} from 'rxjs';

import { BlockfrostProvider } from '../blockfrost-provider';

import type { Responses } from '@blockfrost/blockfrost-js';
import type { Bip32Account, GroupedAddress } from '@cardano-sdk/key-management';
import type { CardanoPaymentAddress } from '@lace-contract/cardano-context';
import type { HttpClient } from '@lace-lib/util-provider';
import type { Logger } from 'ts-log';

/**
 * How far we search for stake keys before concluding there are no more stake credentials.
 */
const STAKE_KEY_GAP = 5;

/**
 * How far we search for payment addresses under a single stake key
 * before concluding that no more addresses exist (or that they are “franken”).
 */
const PAYMENT_CREDENTIAL_GAP = 20;

/**
 * Fetch size for Blockfrost addresses per page.
 */
const BLOCKFROST_PAGE_SIZE = 100;

/**
 * Derive the reward account (stake address) at a given stakeIndex.
 */
const deriveRewardAccount = async (
  account: Bip32Account,
  stakeIndex: number,
): Promise<CardanoRewardAccount> => {
  const address = await account.deriveAddress(
    { type: AddressType.External, index: 0 },
    stakeIndex,
  );

  return CardanoRewardAccount(address.rewardAccount);
};

/**
 * Derive a payment address at a given (payment) index + address type (internal/external).
 */
const derivePaymentAddress = async (
  account: Bip32Account,
  paymentIndex: number,
  stakeIndex: number,
  isInternal: boolean,
): Promise<GroupedAddress> => {
  const type = isInternal ? AddressType.Internal : AddressType.External;
  return account.deriveAddress({ type, index: paymentIndex }, stakeIndex);
};

const compareAddresses = (a: GroupedAddress, b: GroupedAddress) => {
  const indexDiff = a.index - b.index;
  if (indexDiff !== 0) return indexDiff;

  if (a.stakeKeyDerivationPath && b.stakeKeyDerivationPath) {
    return a.stakeKeyDerivationPath.index - b.stakeKeyDerivationPath.index;
  }
  return 0;
};

/**
 * Example BlockfrostAddressDiscovery class that:
 *   - Paginates all addresses from each reward account
 *   - Derives addresses sequentially and checks if they match
 *   - Uses a gap-based approach for both stake keys AND payment addresses
 *   - Logs leftover addresses as unknown
 */
export class BlockfrostAddressDiscovery extends BlockfrostProvider {
  public constructor(client: HttpClient, logger: Logger) {
    super(client, logger);
  }

  /**
   * @returns Observable that emits all discovered addresses one by one. Completes on first error.
   */
  public discover(
    manager: Bip32Account,
  ): Observable<Result<GroupedAddress, ProviderError>> {
    this.logger.debug('Discovering addresses using Blockfrost...');

    const firstAddress$ = from(
      manager.deriveAddress({ index: 0, type: AddressType.External }, 0),
    );

    return forkJoin({
      firstAddress: firstAddress$,
      discovered: this.#discoverAddresses(manager).pipe(toArray()),
    }).pipe(
      mergeMap(({ firstAddress, discovered }) =>
        from([firstAddress, ...discovered]),
      ),
      distinct(({ address }) => address),
      map(Ok<GroupedAddress>),
      catchError(error =>
        of(
          Err(
            error instanceof ProviderError
              ? error
              : new ProviderError(ProviderFailure.Unknown, error),
          ),
        ),
      ),
    );
  }

  /**
   * Main discovery logic:
   *   1. Stake key gap: we keep deriving stake keys until we have
   *      STAKE_KEY_GAP consecutive stake keys that yield zero discovered addresses.
   *   2. Payment credential gap: for each stake key, we stop deriving
   *      payment addresses once we have PAYMENT_CREDENTIAL_GAP consecutive misses.
   */
  #discoverAddresses(account: Bip32Account): Observable<GroupedAddress> {
    return new Observable(subscriber => {
      let isUnsubscribed = false;

      void (async () => {
        let stakeIndex = 0;
        let stakeGapCount = 0;
        try {
          while (stakeGapCount < STAKE_KEY_GAP) {
            if (isUnsubscribed) break;
            this.logger.debug(
              `Deriving reward account for stake index ${stakeIndex}...`,
            );
            const rewardAccount = await deriveRewardAccount(
              account,
              stakeIndex,
            );

            this.logger.debug(
              `Fetching addresses for stake credential ${rewardAccount}...`,
            );
            const allAddressesForStake =
              await this.#fetchAllAddressesForAccount(rewardAccount);

            if (allAddressesForStake.length === 0) {
              stakeGapCount++;
              stakeIndex++;
              continue;
            }

            stakeGapCount = 0;

            const { discovered, unknown } =
              await this.#discoverAddressesForStakeKey(
                account,
                stakeIndex,
                allAddressesForStake,
              );

            for (const address of discovered.sort(compareAddresses)) {
              subscriber.next(address);
            }

            // Any leftover addresses are unknown / “franken”
            if (unknown.length > 0) {
              this.logger.warn(
                `The following addresses under stakeIndex ${stakeIndex} were not matched:`,
                unknown,
              );
            }

            ++stakeIndex;
          }

          subscriber.complete();
        } catch (error) {
          subscriber.error(error);
        }
      })();

      return () => {
        isUnsubscribed = true;
      };
    });
  }

  /**
   * Discover addresses under a single stake key, up to the payment gap.
   * - We keep deriving external & internal addresses for paymentIndex=0..∞,
   *   stopping once we hit PAYMENT_CREDENTIAL_GAP misses in a row.
   *
   * @returns Array of discovered (matched) addresses + leftover “unknown/franken” addresses
   */
  async #discoverAddressesForStakeKey(
    account: Bip32Account,
    stakeIndex: number,
    allAddressesForStake: CardanoPaymentAddress[],
  ): Promise<{
    discovered: GroupedAddress[];
    unknown: CardanoPaymentAddress[];
  }> {
    const discovered: GroupedAddress[] = [];
    const uniqueAddressesForStake = new Set(allAddressesForStake);

    let gapCount = 0;
    let paymentIndex = 0;

    // Keep deriving payment addresses until we reach PAYMENT_CREDENTIAL_GAP consecutive misses
    while (true) {
      if (gapCount >= PAYMENT_CREDENTIAL_GAP) {
        this.logger.debug(
          `Hit payment gap of ${PAYMENT_CREDENTIAL_GAP} for stakeIndex ${stakeIndex}. Stopping.`,
        );
        break;
      }

      const externalAddr = await derivePaymentAddress(
        account,
        paymentIndex,
        stakeIndex,
        false,
      );
      const hasExternalInSet = uniqueAddressesForStake.has(
        externalAddr.address as unknown as CardanoPaymentAddress,
      );

      const internalAddr = await derivePaymentAddress(
        account,
        paymentIndex,
        stakeIndex,
        true,
      );
      const hasInternalInSet = uniqueAddressesForStake.has(
        internalAddr.address as unknown as CardanoPaymentAddress,
      );

      if (hasExternalInSet) {
        discovered.push({
          ...externalAddr,
          stakeKeyDerivationPath: { index: stakeIndex, role: KeyRole.Stake },
        });
        uniqueAddressesForStake.delete(
          externalAddr.address as unknown as CardanoPaymentAddress,
        );
      }

      if (hasInternalInSet) {
        discovered.push({
          ...internalAddr,
          stakeKeyDerivationPath: { index: stakeIndex, role: KeyRole.Stake },
        });
        uniqueAddressesForStake.delete(
          internalAddr.address as unknown as CardanoPaymentAddress,
        );
      }

      if (!hasExternalInSet && !hasInternalInSet) {
        gapCount++;
      } else {
        gapCount = 0;
      }

      ++paymentIndex;
    }

    const unknown = [...uniqueAddressesForStake];

    return { discovered, unknown };
  }

  /**
   * Fetch all addresses associated with a reward account from Blockfrost,
   * handling pagination until the response has fewer than BLOCKFROST_PAGE_SIZE items.
   */
  async #fetchAllAddressesForAccount(
    rewardAccount: CardanoRewardAccount,
  ): Promise<CardanoPaymentAddress[]> {
    const allAddresses: CardanoPaymentAddress[] = [];
    let page = 1;

    this.logger.debug(
      `Fetching addresses for stake ${rewardAccount} (paginated)...`,
    );

    while (true) {
      try {
        const response = await this.request<
          Responses['account_addresses_content']
        >(
          `accounts/${rewardAccount}/addresses?count=${BLOCKFROST_PAGE_SIZE}&page=${page}`,
        );

        if (!response || response.length === 0) {
          break;
        }

        for (const entry of response) {
          allAddresses.push(entry.address as unknown as CardanoPaymentAddress);
        }

        if (response.length < BLOCKFROST_PAGE_SIZE) {
          break; // no more pages
        }

        ++page;
      } catch (error: unknown) {
        if (isNotFoundError(error)) {
          this.logger.debug(
            `No addresses found for stake ${rewardAccount}. 404 from Blockfrost.`,
          );
          break;
        }
        this.logger.error(
          `Error fetching addresses for stake ${rewardAccount}:`,
          error,
        );
        throw error;
      }
    }

    this.logger.debug(
      `Fetched ${allAddresses.length} addresses for stake ${rewardAccount}`,
    );
    return allAddresses;
  }
}
