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
    create: {
      root: '/new-wallet/create',
      setup: '/new-wallet/create/setup',
      keepSecure: '/new-wallet/create/keep-secure',
      recoveryPhrase: '/new-wallet/create/recovery-phrase',
      allDone: '/new-wallet/create/all-done'
    },
    hardware: {
      root: '/new-wallet/hardware',
      connect: '/new-wallet/hardware/connect',
      select: '/new-wallet/hardware/select',
      name: '/new-wallet/hardware/name',
      allDone: '/new-wallet/hardware/all-done'
    },
    restore: {
      root: '/new-wallet/restore',
      setup: '/new-wallet/restore/setup',
      keepSecure: '/new-wallet/restore/keep-secure',
      selectRecoveryPhraseLength: '/new-wallet/restore/select-recovery-phrase-length',
      enterRecoveryPhrase: '/new-wallet/restore/enter-recovery-phrase',
      allDone: '/new-wallet/restore/all-done'
    }
  },
  sharedWallet: {
    root: '/add-shared-wallet'
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
