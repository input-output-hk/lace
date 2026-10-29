import { filter, map, withLatestFrom } from 'rxjs';

import { MidnightNetworkId } from './value-objects';

import type { midnightContextSelectors } from './store';
import type { MidnightAccountProps } from './types';
import type { LaceSideEffect } from '@lace-contract/module';
import type { networkActions, networkSelectors } from '@lace-contract/network';
import type { AnyAccount, walletsSelectors } from '@lace-contract/wallet-repo';

/**
 * Registers the Midnight networks with the global network store once, the
 * first time it reports Midnight absent. Every loadout with Midnight accounts
 * needs this: `wallets.selectActiveNetworkAccounts` drops the accounts of an
 * unregistered blockchain. The registration lands a tick after this decides,
 * so it sets the networks only while Midnight still has none: a network the
 * consumer selected in between keeps precedence.
 *
 * An existing Midnight account pins the testnet selection to its own network,
 * so a profile created before the network store existed keeps syncing where
 * its account lives; otherwise the default testnet is selected.
 */
export const registerMidnightBlockchainNetworks: LaceSideEffect<
  typeof midnightContextSelectors &
    typeof networkSelectors &
    typeof walletsSelectors,
  typeof networkActions
> = (
  _,
  {
    network: { selectBlockchainNetworks$ },
    midnightContext: { selectDefaultTestNetNetworkId$ },
    wallets: { selectAll$ },
  },
  { actions },
) =>
  selectBlockchainNetworks$.pipe(
    filter(blockchainNetworks => !blockchainNetworks?.Midnight),
    withLatestFrom(
      selectDefaultTestNetNetworkId$,
      selectAll$.pipe(
        map(allWallets =>
          allWallets.flatMap((wallet): AnyAccount[] => wallet.accounts),
        ),
      ),
    ),
    map(([, defaultTestNetNetworkId, accounts]) => {
      const existingMidnightAccount = accounts.find(
        account => account.blockchainName === 'Midnight',
      );
      const testnetNetworkId = existingMidnightAccount
        ? (existingMidnightAccount.blockchainSpecific as MidnightAccountProps)
            .networkId
        : defaultTestNetNetworkId;

      return actions.network.registerBlockchainNetworks({
        blockchain: 'Midnight',
        mainnet: MidnightNetworkId('mainnet'),
        testnet: MidnightNetworkId(testnetNetworkId),
      });
    }),
  );
