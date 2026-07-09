import { supportedNetworkIds } from '@lace-contract/cardano-context';
import { HardwareWalletId, WalletType } from '@lace-contract/wallet-repo';

import { LEDGER_ONBOARDING_OPTION_ID } from './const';

import type { AvailableAddons } from '.';
import type { ContextualLaceInit } from '@lace-contract/module';
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

export const makeLoadHwWalletConnector =
  (
    dependencies: HwWalletConnectorDependencies = {},
  ): ContextualLaceInit<HwWalletConnector, AvailableAddons> =>
  ({ loadModules }) => ({
    id: LEDGER_ONBOARDING_OPTION_ID,
    walletType: WalletType.HardwareLedger,
    createWallet: async (state, props) => {
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
        targetNetworks: new Set(supportedNetworkIds.keys()),
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
