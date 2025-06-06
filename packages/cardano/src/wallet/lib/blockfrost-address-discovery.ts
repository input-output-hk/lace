/* eslint-disable no-constant-condition */
import { Cardano } from '@cardano-sdk/core';
import { BlockfrostClient, BlockfrostError } from '@cardano-sdk/cardano-services-client';
import { Logger } from 'ts-log';
import { Responses } from '@blockfrost/blockfrost-js';
import { AddressDiscovery } from '@cardano-sdk/wallet';
import { AddressType, Bip32Account, GroupedAddress, KeyRole } from '@cardano-sdk/key-management';
import uniqBy from 'lodash/uniqBy';

/**
 * How far we search for stake keys before concluding there are no more stake credentials.
 */
const STAKE_KEY_GAP = 5;

/**
 * How far we search for payment addresses under a single stake key
 * before concluding that no more addresses exist (or that they are “franken”).
 */
const PAYMENT_CREDENTIAL_GAP = 100;

/**
 * Fetch size for Blockfrost addresses per page.
 */
const BLOCKFROST_PAGE_SIZE = 100;

const NOT_FOUND_STATUS = 404;

/**
 * Fetch all addresses associated with a reward account from Blockfrost,
 * handling pagination until the response has fewer than BLOCKFROST_PAGE_SIZE items.
 */
const fetchAllAddressesForAccount = async (
  client: BlockfrostClient,
  rewardAccount: Cardano.RewardAccount,
  logger: Logger
): Promise<Cardano.PaymentAddress[]> => {
  const allAddresses: Cardano.PaymentAddress[] = [];
  let page = 1;

  logger.debug(`Fetching addresses for stake ${rewardAccount} (paginated)...`);

  while (true) {
    try {
      const response = await client.request<Responses['account_addresses_content']>(
        `accounts/${rewardAccount}/addresses?count=${BLOCKFROST_PAGE_SIZE}&page=${page}`
      );

      if (!response || response.length === 0) {
        break;
      }

      for (const entry of response) {
        allAddresses.push(entry.address as unknown as Cardano.PaymentAddress);
      }

      if (response.length < BLOCKFROST_PAGE_SIZE) {
        break; // no more pages
      }

      ++page;
    } catch (error: unknown) {
      if (error instanceof BlockfrostError && error?.status === NOT_FOUND_STATUS) {
        logger.debug(`No addresses found for stake ${rewardAccount}. 404 from Blockfrost.`);
        break;
      }
      logger.error(`Error fetching addresses for stake ${rewardAccount}:`, error);
      throw error;
    }
  }

  logger.debug(`Fetched ${allAddresses.length} addresses for stake ${rewardAccount}`);
  return allAddresses;
};

/**
 * Derive the reward account (stake address) at a given stakeIndex.
 */
const deriveRewardAccount = (account: Bip32Account, stakeIndex: number): Cardano.RewardAccount => {
  const address = account.deriveAddress({ type: AddressType.External, index: 0 }, stakeIndex);

  return address.rewardAccount;
};

/**
 * Derive a payment address at a given (payment) index + address type (internal/external).
 */
const derivePaymentAddress = (
  account: Bip32Account,
  paymentIndex: number,
  stakeIndex: number,
  isInternal: boolean
): GroupedAddress => {
  const type = isInternal ? AddressType.Internal : AddressType.External;
  return account.deriveAddress({ type, index: paymentIndex }, stakeIndex);
};

/**
 * Discover addresses under a single stake key, up to the payment gap.
 * - We keep deriving external & internal addresses for paymentIndex=0..∞,
 *   stopping once we hit PAYMENT_CREDENTIAL_GAP misses in a row.
 *
 * @returns Array of discovered (matched) addresses + leftover “unknown/franken” addresses
 */
const discoverAddressesForStakeKey = (
  account: Bip32Account,
  logger: Logger,
  stakeIndex: number,
  allAddressesForStake: Cardano.PaymentAddress[]
): { discovered: GroupedAddress[]; unknown: Cardano.PaymentAddress[] } => {
  const discovered: GroupedAddress[] = [];
  const uniqueAddressesForStake = new Set(allAddressesForStake);

  let gapCount = 0;
  let paymentIndex = 0;

  // Keep deriving payment addresses until we reach PAYMENT_CREDENTIAL_GAP consecutive misses
  while (true) {
    if (gapCount >= PAYMENT_CREDENTIAL_GAP) {
      logger.debug(`Hit payment gap of ${PAYMENT_CREDENTIAL_GAP} for stakeIndex ${stakeIndex}. Stopping.`);
      break;
    }

    const externalAddr = derivePaymentAddress(account, paymentIndex, stakeIndex, false);
    const externalInSet = uniqueAddressesForStake.has(externalAddr.address as Cardano.PaymentAddress);

    const internalAddr = derivePaymentAddress(account, paymentIndex, stakeIndex, true);
    const internalInSet = uniqueAddressesForStake.has(internalAddr.address as Cardano.PaymentAddress);

    if (externalInSet) {
      discovered.push({
        ...externalAddr,
        stakeKeyDerivationPath: { index: stakeIndex, role: KeyRole.Stake }
      });
      uniqueAddressesForStake.delete(externalAddr.address as Cardano.PaymentAddress);
    }

    if (internalInSet) {
      discovered.push({
        ...internalAddr,
        stakeKeyDerivationPath: { index: stakeIndex, role: KeyRole.Stake }
      });
      uniqueAddressesForStake.delete(internalAddr.address as Cardano.PaymentAddress);
    }

    if (!externalInSet && !internalInSet) {
      gapCount++;
    } else {
      gapCount = 0;
    }

    ++paymentIndex;
  }

  const unknown = [...uniqueAddressesForStake];

  return { discovered, unknown };
};

/**
 * Main discovery logic:
 *   1. Stake key gap: we keep deriving stake keys until we have
 *      STAKE_KEY_GAP consecutive stake keys that yield zero discovered addresses.
 *   2. Payment credential gap: for each stake key, we stop deriving
 *      payment addresses once we have PAYMENT_CREDENTIAL_GAP consecutive misses.
 */
const discoverAddresses = async (
  account: Bip32Account,
  client: BlockfrostClient,
  logger: Logger
): Promise<GroupedAddress[]> => {
  const discoveredAll: GroupedAddress[] = [];
  let stakeIndex = 0;
  let stakeGapCount = 0;

  while (stakeGapCount < STAKE_KEY_GAP) {
    logger.debug(`Deriving reward account for stake index ${stakeIndex}...`);
    const rewardAccount = deriveRewardAccount(account, stakeIndex);

    logger.debug(`Fetching addresses for stake credential ${rewardAccount}...`);
    const allAddressesForStake = await fetchAllAddressesForAccount(client, rewardAccount, logger);

    if (allAddressesForStake.length === 0) {
      stakeGapCount++;
      stakeIndex++;
      continue;
    }

    stakeGapCount = 0;

    const { discovered, unknown } = discoverAddressesForStakeKey(account, logger, stakeIndex, allAddressesForStake);

    discoveredAll.push(...discovered);

    // Any leftover addresses are unknown / “franken”
    if (unknown.length > 0) {
      logger.warn(`The following addresses under stakeIndex ${stakeIndex} were not matched:`, unknown);
    }

    ++stakeIndex;
  }

  return discoveredAll;
};

/**
 * Example BlockfrostAddressDiscovery class that:
 *   - Paginates all addresses from each reward account
 *   - Derives addresses sequentially and checks if they match
 *   - Uses a gap-based approach for both stake keys AND payment addresses
 *   - Logs leftover addresses as unknown
 */
export class BlockfrostAddressDiscovery implements AddressDiscovery {
  readonly #logger: Logger;
  readonly #client: BlockfrostClient;

  constructor(client: BlockfrostClient, logger: Logger) {
    this.#client = client;
    this.#logger = logger;
  }

  public async discover(manager: Bip32Account): Promise<GroupedAddress[]> {
    this.#logger.debug('Discovering addresses using Blockfrost...');

    const firstAddress = manager.deriveAddress({ index: 0, type: AddressType.External }, 0);

    const discoveredAddresses = await discoverAddresses(manager, this.#client, this.#logger);

    const addresses = uniqBy([firstAddress, ...discoveredAddresses], 'address');

    // We need to make sure the addresses are sorted since the wallet assumes that the first address
    // in the list is the change address (payment cred 0 and stake cred 0).
    addresses.sort((a, b) => {
      const indexDiff = a.index - b.index;
      if (indexDiff !== 0) return indexDiff;

      if (a.stakeKeyDerivationPath && b.stakeKeyDerivationPath) {
        return a.stakeKeyDerivationPath.index - b.stakeKeyDerivationPath.index;
      }
      return 0;
    });

    return addresses;
  }
}
