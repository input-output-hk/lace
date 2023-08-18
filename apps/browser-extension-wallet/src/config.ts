/* eslint-disable no-magic-numbers */
import { Wallet } from '@lace/cardano';
import { Flags } from '@providers/FeatureFlags/types';
import { EnvironmentTypes } from '@stores';

type CardanoServiceUrls = {
  Mainnet: string;
  Preprod: string;
  Preview: string;
};

export type Config = {
  TOAST_DURATION: number;
  CHAIN: Wallet.ChainName;
  MNEMONIC_LENGTH: number;
  WALLET_SYNC_TIMEOUT: number;
  WALLET_INTERVAL: number;
  CARDANO_SERVICES_URLS: CardanoServiceUrls;
  ADA_PRICE_CHECK_INTERVAL: number;
  AVAILABLE_CHAINS: Wallet.ChainName[];
  CEXPLORER_BASE_URL: Record<EnvironmentTypes, string>;
  SAVED_PRICE_DURATION: number;
  FEATURE_FLAGS: Record<Flags, string>;
};

// eslint-disable-next-line complexity
const envChecks = (chosenChain: Wallet.ChainName): void => {
  if (
    !process.env.CARDANO_SERVICES_URL_MAINNET ||
    !process.env.CARDANO_SERVICES_URL_PREPROD ||
    !process.env.CARDANO_SERVICES_URL_PREVIEW
  ) {
    throw new Error('env vars not complete');
  }

  if (
    !process.env.CEXPLORER_URL_MAINNET ||
    !process.env.CEXPLORER_URL_PREVIEW ||
    !process.env.CEXPLORER_URL_PREPROD ||
    !process.env.CEXPLORER_URL_TESTNET
  ) {
    throw new Error('explorer vars not complete');
  }

  if (!process.env.AVAILABLE_CHAINS) {
    throw new Error('no available chains to connect to');
  }

  if (!process.env.AVAILABLE_CHAINS.includes('Mainnet')) {
    throw new Error('mainnet chain not available in env');
  }

  if (!Wallet.Cardano.ChainIds[chosenChain] || !process.env.AVAILABLE_CHAINS.includes(chosenChain)) {
    throw new Error(`no chain available for selection: ${chosenChain}`);
  }
};

export const config = (): Config => {
  const chosenChain = (process.env.DEFAULT_CHAIN || 'Mainnet') as Wallet.ChainName;
  envChecks(chosenChain);
  return {
    TOAST_DURATION: 1.5,
    // TODO: review default chain for dev vs production building
    CHAIN: chosenChain,
    AVAILABLE_CHAINS: process.env.AVAILABLE_CHAINS.split(',') as Wallet.ChainName[],
    MNEMONIC_LENGTH: 24,
    WALLET_SYNC_TIMEOUT: !Number.isNaN(Number(process.env.WALLET_SYNC_TIMEOUT_IN_SEC))
      ? Number(process.env.WALLET_SYNC_TIMEOUT_IN_SEC) * 1000
      : 60 * 1000,
    WALLET_INTERVAL: !Number.isNaN(Number(process.env.WALLET_INTERVAL_IN_SEC))
      ? Number(process.env.WALLET_INTERVAL_IN_SEC) * 1000
      : 30 * 1000,
    ADA_PRICE_CHECK_INTERVAL: !Number.isNaN(Number(process.env.ADA_PRICE_POLLING_IN_SEC))
      ? Number(process.env.ADA_PRICE_POLLING_IN_SEC) * 1000
      : 30 * 1000,
    CARDANO_SERVICES_URLS: {
      Mainnet: process.env.CARDANO_SERVICES_URL_MAINNET,
      Preprod: process.env.CARDANO_SERVICES_URL_PREPROD,
      Preview: process.env.CARDANO_SERVICES_URL_PREVIEW
    },
    CEXPLORER_BASE_URL: {
      Mainnet: `${process.env.CEXPLORER_URL_MAINNET}/tx`,
      LegacyTestnet: `${process.env.CEXPLORER_URL_TESTNET}/tx`,
      Preprod: `${process.env.CEXPLORER_URL_PREPROD}/tx`,
      Preview: `${process.env.CEXPLORER_URL_PREVIEW}/tx`
    },
    SAVED_PRICE_DURATION: !Number.isNaN(Number(process.env.SAVED_PRICE_DURATION_IN_MINUTES))
      ? Number(process.env.SAVED_PRICE_DURATION_IN_MINUTES)
      : 720,
    FEATURE_FLAGS: {
      PASSWORD_VERIFICATION: process.env.USE_PASSWORD_VERIFICATION,
      DAPP_CONNECTOR: process.env.USE_DAPP_CONNECTOR,
      TREZOR_HW: process.env.USE_TREZOR_HW,
      TOKEN_PRICING: process.env.USE_TOKEN_PRICING,
      DIFFERENT_MNEMONIC_LENGTHS: process.env.USE_DIFFERENT_MNEMONIC_LENGTHS,
      NFT_FOLDERS: process.env.USE_NFT_FOLDERS,
      MULTI_CURRENCY: process.env.USE_MULTI_CURRENCY,
      HIDE_MY_BALANCE: process.env.USE_HIDE_MY_BALANCE,
      MULTI_DELEGATION_STAKING: process.env.USE_MULTI_DELEGATION_STAKING,
      ADA_HANDLE: process.env.USE_ADA_HANDLE,
      DATA_CHECK: process.env.USE_DATA_CHECK,
      POSTHOG_ANALYTICS: process.env.USE_POSTHOG_ANALYTICS
    }
  };
};
