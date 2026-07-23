import { supportedNetworkIds as bitcoinSupportedNetworkIds } from '@lace-contract/bitcoin-context';
import { supportedNetworkIds as cardanoSupportedNetworkIds } from '@lace-contract/cardano-context';
import { HardwareWalletId, WalletType } from '@lace-contract/wallet-repo';

import {
  LEDGER_BITCOIN_ONBOARDING_OPTION_ID,
  LEDGER_ONBOARDING_OPTION_ID,
} from './const';

import type { AvailableAddons } from '.';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type {
  DeviceDescriptor,
  HwWalletConnector,
} from '@lace-contract/onboarding-v2';

export type HwWalletConnectorDependencies = {
  /**
   * Optional legacy resolver for v1 wallets whose IDs lack device info. The
   * extension provides a USB scan; mobile omits it because BLE wallets are
   * always created with a descriptor encoded in the walletId.
   */
  resolveLegacyDevice?: () => Promise<DeviceDescriptor>;
};

const findLedgerConnector = async (
  loadModules: Parameters<
    ContextualLaceInit<HwWalletConnector, AvailableAddons>
  >[0]['loadModules'],
  blockchainName: string,
) => {
  const connectors =
    (await loadModules('addons.loadLedgerHwAccountConnector'))?.flat() ?? [];
  const connector = connectors.find(c => c.blockchainName === blockchainName);
  if (!connector) {
    throw new Error(`No hw account connector for ${blockchainName} on Ledger`);
  }
  return connector;
};

/**
 * All Lace-supported network ids of the blockchain being onboarded. Wallet
 * creation targets every supported network, and the ids must belong to the
 * requested blockchain so the Bitcoin connector is never fed Cardano network
 * ids (and vice versa).
 */
const defaultTargetNetworks = (
  blockchainName: string,
): Set<BlockchainNetworkId> => {
  if (blockchainName === 'Cardano') {
    return new Set(cardanoSupportedNetworkIds.keys());
  }
  if (blockchainName === 'Bitcoin') {
    return new Set(bitcoinSupportedNetworkIds.keys());
  }
  throw new Error(`No supported networks for ${blockchainName} on Ledger`);
};

export const makeLoadHwWalletConnector =
  (
    dependencies: HwWalletConnectorDependencies = {},
  ): ContextualLaceInit<HwWalletConnector, AvailableAddons> =>
  ({ loadModules }) => ({
    id: LEDGER_ONBOARDING_OPTION_ID,
    optionIds: [
      LEDGER_ONBOARDING_OPTION_ID,
      LEDGER_BITCOIN_ONBOARDING_OPTION_ID,
    ],
    walletType: WalletType.HardwareLedger,
    createWallet: async (state, props) => {
      if (!props.device) {
        throw new Error('Ledger wallet creation requires a connected device');
      }
      const connector = await findLedgerConnector(
        loadModules,
        props.blockchainName,
      );
      const walletId = HardwareWalletId(props.device);
      const accounts = await connector.connectHardwareAccounts(state, {
        walletId,
        device: props.device,
        accountIndex: props.accountIndex,
        accountName: `Account #${props.accountIndex}`,
        derivationType: props.derivationType,
        targetNetworks: defaultTargetNetworks(props.blockchainName),
      });
      return {
        walletId,
        metadata: { name: 'Ledger', order: 0 },
        blockchainSpecific: {},
        type: WalletType.HardwareLedger,
        accounts,
      };
    },
    connectAccount: async (state, props) => {
      const connector = await findLedgerConnector(
        loadModules,
        props.blockchainName,
      );
      const device =
        props.device ??
        (dependencies.resolveLegacyDevice
          ? await dependencies.resolveLegacyDevice()
          : undefined);
      if (!device) {
        throw new Error(
          'Ledger device descriptor missing and no legacy resolver available',
        );
      }
      return connector.connectHardwareAccounts(state, {
        walletId: props.walletId,
        device,
        accountIndex: props.accountIndex,
        accountName: props.accountName,
        derivationType: props.derivationType,
        targetNetworks: props.targetNetworks,
      });
    },
  });
