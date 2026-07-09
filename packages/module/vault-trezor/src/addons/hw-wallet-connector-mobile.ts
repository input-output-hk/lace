import { supportedNetworkIds } from '@lace-contract/cardano-context';
import { WalletType } from '@lace-contract/wallet-repo';

import { cardanoAccountsFromXpub } from '../cardano-accounts-from-xpub';
import { TREZOR_ONBOARDING_OPTION_ID } from '../const';
import {
  getCardanoXpubViaDeepLink,
  walletIdFromTrezorDeviceId,
} from '../mobile/cardano-xpub';

import type { AvailableMobileAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { HwWalletConnector } from '@lace-contract/onboarding-v2';

/**
 * On mobile, Trezor Suite owns device communication and every Trezor Connect
 * call is a deep-link round-trip. The discovery addon returns a placeholder
 * descriptor without talking to Suite; the real `device_id` is fetched
 * alongside the xpub in `createWallet` and used to derive the wallet id.
 */
const findTrezorConnector = async (
  loadModules: Parameters<
    ContextualLaceInit<HwWalletConnector, AvailableMobileAddons>
  >[0]['loadModules'],
  blockchainName: string,
) => {
  const connectors =
    (await loadModules('addons.loadTrezorHwAccountConnector'))?.flat() ?? [];
  const connector = connectors.find(c => c.blockchainName === blockchainName);
  if (!connector) {
    throw new Error(`No hw account connector for ${blockchainName} on Trezor`);
  }
  return connector;
};

const loadHwWalletConnector: ContextualLaceInit<
  HwWalletConnector,
  AvailableMobileAddons
> = ({ loadModules }) => ({
  id: TREZOR_ONBOARDING_OPTION_ID,
  walletType: WalletType.HardwareTrezor,
  createWallet: async (state, props) => {
    if (props.blockchainName !== 'Cardano') {
      throw new Error(
        `Trezor mobile only supports Cardano, got: ${props.blockchainName}`,
      );
    }
    const { publicKey, deviceId } = await getCardanoXpubViaDeepLink(
      props.accountIndex,
      props.derivationType,
    );

    const walletId = walletIdFromTrezorDeviceId(deviceId);

    const accounts = cardanoAccountsFromXpub({
      state,
      walletId,
      accountIndex: props.accountIndex,
      accountName: `Account #${props.accountIndex}`,
      targetNetworks: new Set(supportedNetworkIds.keys()),
      publicKey,
    });

    return {
      walletId,
      metadata: {
        name: 'Trezor',
        order: 0,
        derivationType: props.derivationType,
      },
      blockchainSpecific: {},
      type: WalletType.HardwareTrezor,
      accounts,
    };
  },
  connectAccount: async (state, props) => {
    if (!props.device) {
      throw new Error(
        'Trezor device descriptor missing — re-discover the device before adding accounts',
      );
    }
    const connector = await findTrezorConnector(
      loadModules,
      props.blockchainName,
    );
    return connector.connectHardwareAccounts(state, {
      walletId: props.walletId,
      device: props.device,
      accountIndex: props.accountIndex,
      accountName: props.accountName,
      derivationType: props.derivationType,
      targetNetworks: props.targetNetworks,
    });
  },
});

export default loadHwWalletConnector;
