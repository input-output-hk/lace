export const walletRoutePaths = {
  activity: '/activity',
  addressBook: '/address-book',
  coinActivity: '/coin/:id/:symbol/:name',
  confirmDelegation: '/delegate/confirm',
  delegate: '/delegate',
  earn: '/earn',
  nftDetail: '/nft/:id',
  nfts: '/nfts',
  assets: '/assets',
  passphraseInterval: '/settings/passphrase-interval',
  receive: '/receive',
  send: '/send/:id',
  settings: '/settings',
  staking: '/staking',
  dapps: '/dapps',
  voting: '/voting',
  setup: {
    home: '/setup',
    create: '/setup/create',
    hardware: '/setup/hardware',
    restore: '/setup/restore'
  },
  newWallet: {
    root: '/new-wallet',
    create: '/new-wallet/create',
    hardware: '/new-wallet/hardware',
    restore: '/new-wallet/restore'
  },
  sharedWallet: {
    root: '/shared-wallet',
    generateKeys: '/shared-wallet/generate-keys',
    create: '/shared-wallet/create',
    import: '/shared-wallet/import'
  },
  namiMigration: {
    root: '/nami/migration',
    activating: '/nami/migration/activating',
    welcome: '/nami/migration/welcome',
    customize: '/nami/migration/customize',
    allDone: '/nami/migration/all-done'
  }
};

export const dAppRoutePaths = {
  dappConfirmTransaction: '/dapp/transaction',
  dappConnect: '/dapp/connect',
  dappTxSignFailure: '/dapp/transaction/failure',
  dappTxSignSuccess: '/dapp/transaction/success',
  dappSignTx: '/dapp/sign-tx',
  dappSubmitTx: '/dapp/submit-tx',
  dappSignData: '/dapp/sign-data',
  dappNoWallet: '/dapp/no-wallet',
  dappSetCollateral: '/dapp/set-collateral'
};
