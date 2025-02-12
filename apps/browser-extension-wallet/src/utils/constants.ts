import { Wallet } from '@lace/cardano';

export const LACE_APP_ID = 'lace-app';

export type ADASymbols = 'ADA' | 'tADA';

export const CARDANO_COIN_SYMBOL: { [key in Wallet.Cardano.NetworkId]: ADASymbols } = {
  [Wallet.Cardano.NetworkId.Mainnet]: 'ADA',
  [Wallet.Cardano.NetworkId.Testnet]: 'tADA'
};

export const TX_HISTORY_LIMIT_SIZE = 10;

export const cardanoCoin: Wallet.CoinId = {
  id: '1',
  name: 'Cardano',
  decimals: 6,
  symbol: CARDANO_COIN_SYMBOL[Wallet.Cardano.NetworkId.Mainnet]
};

export const MIN_COIN_TO_SEND = 1;

export const COLLATERAL_ADA_AMOUNT = 5;
export const COLLATERAL_AMOUNT_LOVELACES = BigInt(Wallet.util.adaToLovelacesString(String(COLLATERAL_ADA_AMOUNT)));

type StaticBalanceTracker = {
  rewardAccounts: {
    rewards$: Wallet.Cardano.Lovelace;
    deposit$: Wallet.Cardano.Lovelace;
  };
  utxo: {
    total$: Wallet.Cardano.Value;
    available$: Wallet.Cardano.Value;
    unspendable$: Wallet.Cardano.Value;
  };
};

export const DEFAULT_WALLET_BALANCE: StaticBalanceTracker = {
  utxo: {
    total$: {
      coins: BigInt(0)
    },
    available$: {
      coins: BigInt(0)
    },
    unspendable$: {
      coins: BigInt(0)
    }
  },
  rewardAccounts: {
    deposit$: BigInt(0),
    rewards$: BigInt(0)
  }
};

export const PHRASE_FREQUENCY_OPTIONS = [
  {
    value: '',
    label: 'Never'
  },
  {
    value: '31',
    label: 'Every month'
  },
  {
    value: '182',
    label: 'Twice a year'
  },
  {
    value: '365',
    label: 'Yearly'
  }
];

export const HW_POPUPS_WIDTH = 360;

export const DRAWER_PADDING = 25;
export const DRAWER_WIDTH = 664;

export enum MenuItemList {
  ASSETS = 'assets',
  NFT = 'nft',
  TRANSACTIONS = 'transactions',
  STAKING = 'staking',
  DAPPS = 'dapps',
  VOTING = 'voting'
}

export const POPUP_WINDOW = {
  width: 360,
  height: 630
};

export const POPUP_WINDOW_NAMI = {
  width: 400,
  height: 630
};

export const POPUP_WINDOW_NAMI_TITLE = 'Nami (Lace)';

export const DAPP_CHANNELS = {
  userPrompt: `user-prompt-${process.env.WALLET_NAME}`,
  authenticator: `authenticator-${process.env.WALLET_NAME}`,
  walletApi: `wallet-api-${process.env.WALLET_NAME}`,
  authorizedDapps: `authorized-dapps-${process.env.WALLET_NAME}`,
  originsList: `${process.env.WALLET_NAME}Origins`,
  dappData: `dapp-data-${process.env.WALLET_NAME}`
};
export type AppMode = 'popup' | 'browser';

export const APP_MODE_POPUP: AppMode = 'popup';
export const APP_MODE_BROWSER: AppMode = 'browser';

export const SEND_NFT_DEFAULT_AMOUNT = '1';

export const COINGECKO_URL = 'https://www.coingecko.com';

export const MULTIDELEGATION_FIRST_VISIT_LS_KEY = 'multidelegationFirstVisit';
export const MULTIDELEGATION_DAPP_COMPATIBILITY_LS_KEY = 'isMultiDelegationDAppCompatibilityModalVisible';
export const STAKING_BROWSER_PREFERENCES_LS_KEY = 'stakingBrowserPreferences';

export const TRACK_POPUP_CHANNEL = 'popup';
