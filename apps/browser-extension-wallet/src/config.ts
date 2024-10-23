/* eslint-disable no-magic-numbers */
import { Milliseconds } from '@cardano-sdk/core';
import { Wallet } from '@lace/cardano';
import { EnvironmentTypes } from '@stores';

type ByNetwork<T> = {
  [key in Wallet.ChainName]: T;
};

type CExplorerUrlPaths = {
  Tx: string;
  Asset: string;
  Policy: string;
};

export type Config = {
  TOAST_DURATION: number;
  CHAIN: Wallet.ChainName;
  MNEMONIC_LENGTH: number;
  WALLET_SYNC_TIMEOUT: number;
  WALLET_INTERVAL: number;
  CARDANO_SERVICES_URLS: ByNetwork<string>;
  BLOCKFROST_CONFIGS: ByNetwork<Wallet.BlockfrostClientConfig>;
  BLOCKFROST_RATE_LIMIT_CONFIG: Wallet.RateLimiterConfig;
  ADA_PRICE_CHECK_INTERVAL: number;
  TOKEN_PRICE_CHECK_INTERVAL: number;
  AVAILABLE_CHAINS: Wallet.ChainName[];
  CEXPLORER_BASE_URL: Record<EnvironmentTypes, string>;
  CEXPLORER_URL_PATHS: CExplorerUrlPaths;
  SAVED_PRICE_DURATION: number;
  DEFAULT_SUBMIT_API: string;
};

// eslint-disable-next-line complexity
const envChecks = (chosenChain: Wallet.ChainName): void => {
  if (
    !process.env.CARDANO_SERVICES_URL_MAINNET ||
    !process.env.CARDANO_SERVICES_URL_PREPROD ||
    !process.env.CARDANO_SERVICES_URL_PREVIEW ||
    !process.env.BLOCKFROST_URL_MAINNET ||
    !process.env.BLOCKFROST_URL_PREPROD ||
    !process.env.BLOCKFROST_URL_PREVIEW ||
    !process.env.BLOCKFROST_PROJECT_ID_MAINNET ||
    !process.env.BLOCKFROST_PROJECT_ID_PREPROD ||
    !process.env.BLOCKFROST_PROJECT_ID_PREVIEW
  ) {
    throw new Error('env vars not complete');
  }

  if (!process.env.CEXPLORER_URL_MAINNET || !process.env.CEXPLORER_URL_PREVIEW || !process.env.CEXPLORER_URL_PREPROD) {
    throw new Error('explorer vars not complete');
  }

  if (!process.env.AVAILABLE_CHAINS) {
    throw new Error('no available chains to connect to');
  }

  if (!process.env.AVAILABLE_CHAINS.includes('Mainnet') && process.env.DEFAULT_CHAIN !== 'Sanchonet') {
    throw new Error('mainnet chain not available in env');
  }

  if (!Wallet.Cardano.ChainIds[chosenChain] || !process.env.AVAILABLE_CHAINS.includes(chosenChain)) {
    throw new Error(`no chain available for selection: ${chosenChain}`);
  }
};

const getBlockfrostConfigs = (): ByNetwork<Wallet.BlockfrostClientConfig> => ({
  Mainnet: {
    baseUrl: process.env.BLOCKFROST_URL_MAINNET,
    projectId: process.env.BLOCKFROST_PROJECT_ID_MAINNET
  },
  Preprod: {
    baseUrl: process.env.BLOCKFROST_URL_PREPROD,
    projectId: process.env.BLOCKFROST_PROJECT_ID_PREPROD
  },
  Preview: {
    baseUrl: process.env.BLOCKFROST_URL_PREVIEW,
    projectId: process.env.BLOCKFROST_PROJECT_ID_PREVIEW
  },
  Sanchonet: {
    baseUrl: process.env.BLOCKFROST_URL_SANCHONET,
    projectId: process.env.BLOCKFROST_PROJECT_ID_SANCHONET
  }
});

export const config = (): Config => {
  const chosenChain = (process.env.DEFAULT_CHAIN || 'Mainnet') as Wallet.ChainName;
  if (process.env.BUILD_DEV_PREVIEW !== 'true') envChecks(chosenChain);
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
    TOKEN_PRICE_CHECK_INTERVAL: !Number.isNaN(Number(process.env.TOKEN_PRICE_POLLING_IN_SEC))
      ? Number(process.env.TOKEN_PRICE_POLLING_IN_SEC) * 1000
      : 300 * 1000,
    BLOCKFROST_CONFIGS: getBlockfrostConfigs(),
    BLOCKFROST_RATE_LIMIT_CONFIG: {
      size: 500,
      increaseAmount: 10,
      // eslint-disable-next-line new-cap
      increaseInterval: Milliseconds(1000)
    },
    CARDANO_SERVICES_URLS: {
      Mainnet: process.env.CARDANO_SERVICES_URL_MAINNET,
      Preprod: process.env.CARDANO_SERVICES_URL_PREPROD,
      Preview: process.env.CARDANO_SERVICES_URL_PREVIEW,
      Sanchonet: process.env.CARDANO_SERVICES_URL_SANCHONET
    },
    CEXPLORER_BASE_URL: {
      Mainnet: `${process.env.CEXPLORER_URL_MAINNET}`,
      Preprod: `${process.env.CEXPLORER_URL_PREPROD}`,
      Preview: `${process.env.CEXPLORER_URL_PREVIEW}`,
      Sanchonet: `${process.env.CEXPLORER_URL_SANCHONET}`
    },
    CEXPLORER_URL_PATHS: {
      Tx: 'tx',
      Asset: 'asset',
      Policy: 'policy'
    },
    SAVED_PRICE_DURATION: !Number.isNaN(Number(process.env.SAVED_PRICE_DURATION_IN_MINUTES))
      ? Number(process.env.SAVED_PRICE_DURATION_IN_MINUTES)
      : 720,
    DEFAULT_SUBMIT_API: 'http://localhost:8090/api/submit/tx'
  };
};
