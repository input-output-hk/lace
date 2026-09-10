import { BigNumber } from '@lace-lib/util';

import type { AccountMapping } from '../slice';
import type { Cardano } from '@cardano-sdk/core';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { AnyWallet } from '@lace-contract/wallet-repo';

/**
 * Plans which destination account each source account lands in.
 *
 * Source accounts are partitioned off the flat reviewed set by the owning
 * address's accountIndex — the same attribution the signer uses, so the plan
 * can never claim a split the sweep would not make. Destination indices are
 * PLANNED, not created: a fresh destination starts at its unused account 0;
 * an existing destination starts past its highest Cardano account, so
 * migrated funds land in fresh accounts and never mingle with history the
 * wallet already has. Rows keep source order (ascending index), so the first
 * row is the primary destination account.
 */
export const planAccountMapping = ({
  utxos,
  addresses,
  destinationWallet,
  isExistingDestination,
  blockchainNetworkId,
  fixedDestinationAccountIndex,
}: {
  utxos: Cardano.Utxo[];
  addresses: GroupedAddress[];
  destinationWallet: AnyWallet | undefined;
  isExistingDestination: boolean;
  blockchainNetworkId: unknown;
  /**
   * Set when the destination cannot grow accounts on its own — a hardware
   * wallet, whose every account needs a device ceremony Lace cannot perform
   * mid-sweep. Every row then lands in this one already-existing account, and
   * preserve mode is not offered (see `supportsPreservation`).
   */
  fixedDestinationAccountIndex?: number;
}): AccountMapping => {
  const accountIndexByAddress = new Map<string, number>(
    addresses.map(({ address, accountIndex }) => [`${address}`, accountIndex]),
  );

  const bySourceIndex = new Map<
    number,
    { coin: bigint; assetIds: Set<string>; utxoCount: number }
  >();
  for (const [, output] of utxos) {
    // Unattributable UTxOs cannot occur in a reviewed plan (the scan built it
    // from these very addresses); attributing to account 0 keeps the plan
    // total equal to the sweep total even if that invariant ever breaks.
    const accountIndex = accountIndexByAddress.get(`${output.address}`) ?? 0;
    const entry = bySourceIndex.get(accountIndex) ?? {
      coin: 0n,
      assetIds: new Set<string>(),
      utxoCount: 0,
    };
    entry.coin += BigNumber.valueOf(output.value.coins);
    for (const assetId of output.value.assets?.keys() ?? []) {
      entry.assetIds.add(`${assetId}`);
    }
    entry.utxoCount += 1;
    bySourceIndex.set(accountIndex, entry);
  }

  // Every scanned account appears even when it currently holds no UTxOs: the
  // address set names them all, and this is the only thing that decides. What
  // such an account still holds — rewards, a registered stake key's deposit, or
  // nothing — is NOT known here, so nothing downstream may claim it is
  // rewards.
  for (const { accountIndex } of addresses) {
    if (!bySourceIndex.has(accountIndex)) {
      bySourceIndex.set(accountIndex, {
        coin: 0n,
        assetIds: new Set(),
        utxoCount: 0,
      });
    }
  }

  // Fresh (and hardware) destinations were created inside this wizard with an
  // unused account 0. An existing wallet's candidates start at its lowest
  // Cardano account on this network; which of them are actually usable is
  // decided by the on-chain freshness probe, not by index arithmetic.
  const destinationCardanoIndexes = isExistingDestination
    ? (destinationWallet?.accounts ?? [])
        .filter(
          account =>
            account.blockchainName === 'Cardano' &&
            account.blockchainNetworkId === blockchainNetworkId,
        )
        .map(
          account =>
            (account.blockchainSpecific as { accountIndex?: number })
              ?.accountIndex ?? 0,
        )
    : [];
  // The wallet's FIRST account, not past its last: an account already loaded
  // that has never touched the chain is the target we want, and the freshness
  // probe advances past any candidate it finds used. Starting past the highest
  // index created a new account even when an unused one was already there.
  const destinationStartIndex = isExistingDestination
    ? Math.min(0, ...destinationCardanoIndexes)
    : 0;

  return [...bySourceIndex.entries()]
    .sort(([a], [b]) => a - b)
    .map(([sourceAccountIndex, figures], ordinal) => ({
      sourceAccountIndex,
      destinationAccountIndex:
        fixedDestinationAccountIndex ?? destinationStartIndex + ordinal,
      coin: `${figures.coin}`,
      assetCount: figures.assetIds.size,
      utxoCount: figures.utxoCount,
    }));
};
