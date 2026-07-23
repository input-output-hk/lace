import { WalletType } from '@lace-contract/wallet-repo';
import { WrongDeviceError } from '@lace-lib/util-hw';

import {
  KEYSTONE_BITCOIN_ONBOARDING_OPTION_ID,
  KEYSTONE_DEVICE_NAME,
} from '../const';
import { assertBlockchain } from '../shared/assert-blockchain';

import { buildBitcoinAccount, importBitcoinAccount } from './account-export';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { HwWalletConnector } from '@lace-contract/onboarding-v2';
import type { HardwareWalletAccount } from '@lace-contract/wallet-repo';

const assertBitcoin = (blockchainName: string): void => {
  assertBlockchain('Bitcoin', blockchainName, 'Bitcoin Keystone connector');
};

/**
 * Air-gapped Bitcoin Keystone connector. The user opens the device's
 * connect-software-wallet screen; Lace scans the exported crypto-account,
 * selects the native-segwit descriptor, infers the network from the coin type,
 * and builds one network-specific watch-only account. The wallet id comes from
 * the device fingerprint so Cardano and Bitcoin accounts of the same device
 * group under one wallet.
 */
const loadHwWalletConnector: ContextualLaceInit<
  HwWalletConnector,
  AvailableAddons
> = () => ({
  id: KEYSTONE_BITCOIN_ONBOARDING_OPTION_ID,
  walletType: WalletType.HardwareKeystone,
  createWallet: async (_state, props) => {
    assertBitcoin(props.blockchainName);
    const { walletId, key, network } = await importBitcoinAccount();
    const account = buildBitcoinAccount({
      walletId,
      key,
      network,
      accountName: `Account #${key.account}`,
    });
    return {
      walletId,
      metadata: { name: KEYSTONE_DEVICE_NAME, order: 0 },
      blockchainSpecific: {},
      type: WalletType.HardwareKeystone,
      accounts: [account] as HardwareWalletAccount[],
    };
  },
  connectAccount: async (_state, props) => {
    assertBitcoin(props.blockchainName);
    const { walletId, key, network } = await importBitcoinAccount();
    if (walletId !== props.walletId) {
      throw new WrongDeviceError();
    }
    const account = buildBitcoinAccount({
      walletId: props.walletId,
      key,
      network,
      accountName: props.accountName,
    });
    return [account] as HardwareWalletAccount[];
  },
});

export default loadHwWalletConnector;
