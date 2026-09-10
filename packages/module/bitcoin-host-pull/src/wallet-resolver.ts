import { BitcoinNetworkId } from '@lace-contract/bitcoin-context';

import { deriveNativeSegWitReceiveAddress } from './derive-address';

import type { BitcoinBip32AccountProps } from '@lace-contract/bitcoin-context';
import type { AnyAccount } from '@lace-contract/wallet-repo';

/** The host-owned account a `bitcoin.getUtxos` call resolves to — a
 * (walletId, accountIndex) pair (the network rides the wire from the provider
 * context, so it is not part of the resolved identity; ADR 11). */
export type ResolvedBitcoinAccount = { walletId: string; accountIndex: number };

/**
 * Resolves the host's (walletId, accountIndex) pair from the queried ADDRESS —
 * what `BitcoinProvider.getUTxOs` carries (blockchain-bitcoin never passes a
 * walletId). Mirrors the Cardano sibling (@lace-module/cardano-host-pull
 * wallet-resolver.ts): it caches a derived lookup map, but sources the accounts
 * from WALLET-REPO state rather than the host — the cardano-host-pull hydrator
 * already projects Bitcoin accounts into the repo (host projection), so re-fetching from
 * the host (a wallets.list leg) would be redundant.
 *
 * The map is rebuilt whenever wallet-repo emits (a side effect drives
 * `setAccounts`), so a newly created/imported wallet or a newly added account
 * is picked up. Each Bitcoin account derives its single native-segwit
 * external/0 address (the only address Lace produces), and addresses are unique
 * across networks (mainnet vs testnet4 encodings differ), so the address alone
 * identifies the account.
 */
export class BitcoinWalletResolver {
  #addressToAccount = new Map<string, ResolvedBitcoinAccount>();

  public setAccounts(accounts: readonly AnyAccount[]): void {
    const map = new Map<string, ResolvedBitcoinAccount>();
    for (const account of accounts) {
      if (
        account.blockchainName !== 'Bitcoin' ||
        (account.accountType !== 'InMemory' &&
          account.accountType !== 'HardwareLedger' &&
          account.accountType !== 'HardwareTrezor' &&
          account.accountType !== 'HardwareKeystone' &&
          account.accountType !== 'HardwareSeedSigner')
      ) {
        continue;
      }
      const network = BitcoinNetworkId.getBitcoinNetwork(
        account.blockchainNetworkId,
      );
      if (!network) continue;
      const { accountIndex, extendedAccountPublicKeys } =
        account.blockchainSpecific as BitcoinBip32AccountProps;
      const address = deriveNativeSegWitReceiveAddress(
        extendedAccountPublicKeys.nativeSegWit,
        network,
      );
      map.set(address, { walletId: account.walletId, accountIndex });
    }
    this.#addressToAccount = map;
  }

  public accountForAddress(
    address: string,
  ): ResolvedBitcoinAccount | undefined {
    return this.#addressToAccount.get(address);
  }
}
