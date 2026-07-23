import {
  allSupportedNetworks,
  BitcoinAccountId,
  BitcoinNetwork,
  BitcoinNetworkId,
  supportedNetworkIds,
} from '@lace-contract/bitcoin-context';
import { createBlockchainNetworkTargetResolver } from '@lace-contract/network';
import { classifyHardwareError } from '@lace-lib/util-hw';

import type { LedgerBitcoinTransport } from '../ledger-bitcoin-transport';
import type { BitcoinBip32AccountProps } from '@lace-contract/bitcoin-context';
import type { HwAccountConnector } from '@lace-contract/onboarding-v2';
import type { HardwareWalletAccount } from '@lace-contract/wallet-repo';

export interface BitcoinHwAccountConnectorDependencies {
  transport: LedgerBitcoinTransport;
}

const resolveTargetNetworks = createBlockchainNetworkTargetResolver(
  supportedNetworkIds,
  allSupportedNetworks,
);

/** SLIP-44 coin type for the given Bitcoin network (0 mainnet, 1 testnet). */
const coinTypeFor = (network: BitcoinNetwork): number =>
  network === BitcoinNetwork.Mainnet ? 0 : 1;

/** BIP-84 native-segwit account derivation path, e.g. "m/84'/0'/0'". */
const nativeSegWitPath = (network: BitcoinNetwork, accountIndex: number) =>
  `m/84'/${coinTypeFor(network)}'/${accountIndex}'`;

/**
 * True when the Ledger Bitcoin app refused a silent xpub export (0x6a82).
 * Mainnet and testnet are separate Ledger apps, and each app only exports
 * keys for its own SLIP-44 coin type without on-device confirmation, so the
 * coin type of the other network is always refused with this status.
 * Falls back to classifyHardwareError, which matches the status in the
 * message and walks wrapped errors, so a refusal that lost its statusCode
 * field (e.g. crossing a messaging bridge or wrapped by another error) is
 * still recognized instead of failing the whole connect.
 */
const isSilentExportRefused = (error: unknown): error is Error =>
  error instanceof Error &&
  ((error.name === 'TransportStatusError' &&
    (error as { statusCode?: number }).statusCode === 0x6a_82) ||
    classifyHardwareError(error) === 'wrong-network-app');

/**
 * Bitcoin Ledger account connector. Fetches the device master fingerprint
 * once, then derives the BIP-84 native-segwit account xpub for each target
 * network and builds one watch-only account per network the open app can
 * serve. Ledger ships one app per network (Bitcoin, Bitcoin Test), so the
 * network whose coin type the open app refuses to export silently is
 * skipped; connecting with the other app later adds that network's account.
 * Only the native-segwit xpub is exported; the master fingerprint is stored
 * so later PSBT signing can target the device seed. Xpubs are fetched
 * sequentially because the device serves one APDU exchange at a time.
 */
export const makeBitcoinHwAccountConnector = ({
  transport,
}: BitcoinHwAccountConnectorDependencies): HwAccountConnector => ({
  blockchainName: 'Bitcoin',
  connectHardwareAccounts: async (_state, props) => {
    const { device, accountIndex, accountName, walletId, targetNetworks } =
      props;
    const masterFingerprint = await transport.getMasterFingerprint(device);
    const accounts: HardwareWalletAccount<BitcoinBip32AccountProps>[] = [];
    let refusal: Error | undefined;

    for (const network of resolveTargetNetworks(targetNetworks)) {
      let nativeSegWit: string;
      try {
        nativeSegWit = await transport.getExtendedPubkey(
          device,
          nativeSegWitPath(network, accountIndex),
        );
      } catch (error) {
        if (!isSilentExportRefused(error)) throw error;
        refusal = error;
        continue;
      }
      const networkId = BitcoinNetworkId(network);
      accounts.push({
        accountType: 'HardwareLedger',
        blockchainName: 'Bitcoin',
        blockchainNetworkId: networkId,
        networkType: network === BitcoinNetwork.Mainnet ? 'mainnet' : 'testnet',
        walletId,
        accountId: BitcoinAccountId(walletId, accountIndex, network),
        metadata: { name: accountName },
        blockchainSpecific: {
          accountIndex,
          extendedAccountPublicKeys: { nativeSegWit },
          networkId,
          masterFingerprint,
        } satisfies BitcoinBip32AccountProps,
      });
    }

    if (accounts.length === 0 && refusal !== undefined) throw refusal;
    return accounts;
  },
});
