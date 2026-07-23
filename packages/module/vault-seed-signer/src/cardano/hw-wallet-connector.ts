import { supportedNetworkIds } from '@lace-contract/cardano-context';
import { WalletType } from '@lace-contract/wallet-repo';
import { WrongDeviceError } from '@lace-lib/util-hw';

import {
  SEED_SIGNER_DEVICE_NAME,
  SEED_SIGNER_ONBOARDING_OPTION_ID,
} from '../const';
import { assertBlockchain } from '../shared/assert-blockchain';

import { buildCardanoAccounts, exportAccounts } from './account-export';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { HwWalletConnector } from '@lace-contract/onboarding-v2';
import type { HardwareWalletAccount } from '@lace-contract/wallet-repo';

const assertCardano = (blockchainName: string): void => {
  assertBlockchain('Cardano', blockchainName, 'Seed signer');
};

/**
 * Air-gapped seed signer wallet connector. Wallet identity and accounts come
 * from the QR account-export exchange: there is no USB/BLE device, so the
 * wallet id is derived from the device master fingerprint (xfp). Supports adding
 * multiple accounts to the same seed-signer wallet via {@link HwWalletConnector.connectAccount}.
 */
const loadHwWalletConnector: ContextualLaceInit<
  HwWalletConnector,
  AvailableAddons
> = () => ({
  id: SEED_SIGNER_ONBOARDING_OPTION_ID,
  walletType: WalletType.HardwareSeedSigner,
  createWallet: async (state, props) => {
    assertCardano(props.blockchainName);
    const { walletId, keys } = await exportAccounts([props.accountIndex]);
    const accounts: HardwareWalletAccount[] = keys.flatMap(key =>
      buildCardanoAccounts(state, {
        walletId,
        key,
        accountName: `Account #${key.accountIndex}`,
        targetNetworks: new Set(supportedNetworkIds.keys()),
      }),
    );
    return {
      walletId,
      metadata: { name: SEED_SIGNER_DEVICE_NAME, order: 0 },
      blockchainSpecific: {},
      type: WalletType.HardwareSeedSigner,
      accounts,
    };
  },
  connectAccount: async (state, props) => {
    assertCardano(props.blockchainName);
    const { walletId, keys } = await exportAccounts([props.accountIndex]);
    if (walletId !== props.walletId) {
      throw new WrongDeviceError();
    }
    return keys.flatMap(key =>
      buildCardanoAccounts(state, {
        walletId: props.walletId,
        key,
        accountName: props.accountName,
        targetNetworks: props.targetNetworks,
      }),
    );
  },
});

export default loadHwWalletConnector;
