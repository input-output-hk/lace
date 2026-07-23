import { WalletType } from '@lace-contract/wallet-repo';

import loadBitcoinConnector from '../bitcoin/connector';
import loadCardanoConnector from '../cardano/hw-wallet-connector';
import {
  SEED_SIGNER_BITCOIN_ONBOARDING_OPTION_ID,
  SEED_SIGNER_ONBOARDING_OPTION_ID,
} from '../const';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit, State } from '@lace-contract/module';
import type {
  AddHwWalletAccountProps,
  CreateHardwareWalletProps,
  HwWalletConnector,
} from '@lace-contract/onboarding-v2';
import type { HardwareWalletAccount } from '@lace-contract/wallet-repo';

/**
 * Resolves the per-blockchain Seed Signer connector. Both per-blockchain
 * connector modules are statically imported so they ride in this connector's
 * preloaded chunk and a cold service worker can dispatch without a failed
 * dynamic chunk load (ADR-25). bitcoinjs-lib stays out of the preload graph: it
 * is imported lazily inside the Bitcoin signer's sign(), not by the Bitcoin
 * connector module.
 */
const resolveBlockchainConnector = (
  blockchainName: string,
  context: Parameters<ContextualLaceInit<HwWalletConnector, AvailableAddons>>,
): HwWalletConnector => {
  if (blockchainName === 'Bitcoin') {
    return loadBitcoinConnector(...context) as HwWalletConnector;
  }
  if (blockchainName === 'Cardano') {
    return loadCardanoConnector(...context) as HwWalletConnector;
  }
  throw new Error(`Seed signer does not support blockchain: ${blockchainName}`);
};

/**
 * Single air-gapped Seed Signer wallet connector covering both blockchains.
 * loadHwWalletConnector is single-valued (one connector per module), so this
 * one connector advertises both onboarding option ids via optionIds and
 * dispatches createWallet/connectAccount by props.blockchainName to the Cardano
 * or Bitcoin connector. The create-by-id resolvers match it for either tile;
 * the add-account resolver matches it by walletType (HardwareSeedSigner), which
 * both blockchains share. Construction is side-effect free; the QR exchange and
 * the heavy per-blockchain imports only run inside createWallet/connectAccount.
 */
const loadHwWalletConnector: ContextualLaceInit<
  HwWalletConnector,
  AvailableAddons
> = (loadProps, dependencies) => ({
  id: SEED_SIGNER_ONBOARDING_OPTION_ID,
  optionIds: [
    SEED_SIGNER_ONBOARDING_OPTION_ID,
    SEED_SIGNER_BITCOIN_ONBOARDING_OPTION_ID,
  ],
  walletType: WalletType.HardwareSeedSigner,
  createWallet: async (state: State, props: CreateHardwareWalletProps) => {
    const connector = resolveBlockchainConnector(props.blockchainName, [
      loadProps,
      dependencies,
    ]);
    return connector.createWallet(state, props);
  },
  connectAccount: async (
    state: State,
    props: AddHwWalletAccountProps,
  ): Promise<HardwareWalletAccount[]> => {
    const connector = resolveBlockchainConnector(props.blockchainName, [
      loadProps,
      dependencies,
    ]);
    return connector.connectAccount(state, props);
  },
});

export default loadHwWalletConnector;
