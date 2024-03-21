export interface State {
  encryptedPrivateKey: string;
  accounts: Account[];
  hardwareWallets: HarwareWallet[];
  dapps: string[];
  currency: 'usd' | 'eur';
  analytics: Analytics;
}

export interface Account {
  index: number;
  name: string;
  extendedPublicKey: string;
  collaterals: { [K in Networks]?: Collateral };
}

export interface HarwareWallet extends Account {
  vendor: 'ledger' | 'trezor';
}

export interface Collateral {
  lovelace: string;
  tx: {
    hash: string;
    index: number;
  };
}

export type Networks = 'mainnet' | 'preview' | 'preprod' | 'testnet';

interface Analytics {
  enabled: boolean;
  userId: string;
}
