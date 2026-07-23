import { WalletType } from '@lace-contract/wallet-repo';
import { WrongDeviceError } from '@lace-lib/util-hw';

import {
  SEED_SIGNER_BITCOIN_DEVICE_NAME,
  SEED_SIGNER_BITCOIN_ONBOARDING_OPTION_ID,
} from '../const';
import { assertBlockchain } from '../shared/assert-blockchain';

import { buildBitcoinAccount, importBitcoinAccount } from './account-export';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { HwWalletConnector } from '@lace-contract/onboarding-v2';
import type { HardwareWalletAccount } from '@lace-contract/wallet-repo';

const assertBitcoin = (blockchainName: string): void => {
  assertBlockchain('Bitcoin', blockchainName, 'Bitcoin seed signer');
};

/**
 * Air-gapped Bitcoin Seed Signer connector. The user drives Export Xpub on the
 * device (Single Sig, Native SegWit, Sparrow); Lace scans the exported key
 * (crypto-hdkey or crypto-account), validates it, infers the network from the
 * coin type, and builds one
 * network-specific watch-only account. The wallet id comes from the device
 * fingerprint so mainnet and testnet imports group under one wallet.
 */
const loadHwWalletConnector: ContextualLaceInit<
  HwWalletConnector,
  AvailableAddons
> = () => ({
  id: SEED_SIGNER_BITCOIN_ONBOARDING_OPTION_ID,
  walletType: WalletType.HardwareSeedSigner,
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
      metadata: { name: SEED_SIGNER_BITCOIN_DEVICE_NAME, order: 0 },
      blockchainSpecific: {},
      type: WalletType.HardwareSeedSigner,
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
