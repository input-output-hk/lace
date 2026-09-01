import { WalletType } from '@lace-contract/wallet-repo';

import {
  buildBitcoinAccounts,
  exportBitcoinAccountKeys,
} from '../bitcoin/hw-account-connector';
import { cardanoAccountsFromXpub } from '../cardano-accounts-from-xpub';
import {
  TREZOR_BITCOIN_ONBOARDING_OPTION_ID,
  TREZOR_ONBOARDING_OPTION_ID,
} from '../const';
import { defaultTargetNetworks } from '../default-target-networks';
import {
  getCardanoXpubViaDeepLink,
  TrezorMobileMissingDeviceIdError,
  walletIdFromTrezorDeviceId,
} from '../mobile/cardano-xpub';
import { getTrezorConnect } from '../mobile/trezor-connect-bridge';

import type { AvailableMobileAddons } from '..';
import type { ContextualLaceInit, State } from '@lace-contract/module';
import type {
  CreateHardwareWalletProps,
  HwWalletConnector,
} from '@lace-contract/onboarding-v2';
import type {
  HardwareWalletAccount,
  WalletId,
} from '@lace-contract/wallet-repo';

/**
 * On mobile, Trezor Suite owns device communication and every Trezor Connect
 * call is a deep-link round-trip. The discovery addon returns a placeholder
 * descriptor without talking to Suite; the real `device_id` is fetched
 * alongside the xpubs in `createWallet` and used to derive the wallet id, so
 * Cardano and Bitcoin accounts of one physical device share one wallet.
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

interface WalletParts {
  walletId: WalletId;
  accounts: HardwareWalletAccount[];
}

const createCardanoWalletParts = async (
  state: State,
  props: CreateHardwareWalletProps,
): Promise<WalletParts> => {
  const { publicKey, deviceId } = await getCardanoXpubViaDeepLink(
    props.accountIndex,
    props.derivationType,
  );
  const walletId = walletIdFromTrezorDeviceId(deviceId);
  return {
    walletId,
    accounts: cardanoAccountsFromXpub({
      state,
      walletId,
      accountIndex: props.accountIndex,
      accountName: `Account #${props.accountIndex}`,
      targetNetworks: defaultTargetNetworks('Cardano'),
      publicKey,
    }),
  };
};

const createBitcoinWalletParts = async (
  props: CreateHardwareWalletProps,
): Promise<WalletParts> => {
  const connect = await getTrezorConnect();
  const deviceExport = await exportBitcoinAccountKeys(connect, {
    accountIndex: props.accountIndex,
    targetNetworks: defaultTargetNetworks('Bitcoin'),
  });
  if (!deviceExport.deviceId) throw new TrezorMobileMissingDeviceIdError();
  const walletId = walletIdFromTrezorDeviceId(deviceExport.deviceId);
  return {
    walletId,
    accounts: buildBitcoinAccounts({
      walletId,
      accountIndex: props.accountIndex,
      accountName: `Account #${props.accountIndex}`,
      deviceExport,
    }),
  };
};

const loadHwWalletConnector: ContextualLaceInit<
  HwWalletConnector,
  AvailableMobileAddons
> = ({ loadModules }) => ({
  id: TREZOR_ONBOARDING_OPTION_ID,
  optionIds: [TREZOR_ONBOARDING_OPTION_ID, TREZOR_BITCOIN_ONBOARDING_OPTION_ID],
  walletType: WalletType.HardwareTrezor,
  createWallet: async (state, props) => {
    if (
      props.blockchainName !== 'Cardano' &&
      props.blockchainName !== 'Bitcoin'
    ) {
      throw new Error(
        `Trezor mobile only supports Cardano and Bitcoin, got: ${props.blockchainName}`,
      );
    }
    const { walletId, accounts } =
      props.blockchainName === 'Bitcoin'
        ? await createBitcoinWalletParts(props)
        : await createCardanoWalletParts(state, props);

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
        'Trezor device descriptor missing - re-discover the device before adding accounts',
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
