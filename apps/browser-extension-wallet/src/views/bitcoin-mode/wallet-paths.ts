export const walletRoutePaths = {
  activity: '/bitcoin-activity',
  addressBook: '/bitcoin-address-book',
  coinActivity: '/bitcoin-coin/:id/:symbol/:name',
  confirmDelegation: '/bitcoin-delegate/confirm',
  delegate: '/bitcoin-delegate',
  earn: '/bitcoin-earn',
  nftDetail: '/bitcoin-nft/:id',
  nfts: '/bitcoin-nfts',
  assets: '/bitcoin-assets',
  passphraseInterval: '/bitcoin-settings/passphrase-interval',
  receive: '/bitcoin-receive',
  send: '/bitcoin-send/:id',
  settings: '/bitcoin-settings',
  staking: '/bitcoin-staking',
  dapps: '/bitcoin-dapp-explorer',
  voting: '/bitcoin-voting',
  signMessage: '/bitcoin-sign-message',
  setup: {
    home: '/bitcoin-setup',
    create: '/bitcoin-setup/create',
    hardware: '/bitcoin-setup/hardware',
    restore: '/bitcoin-setup/restore'
  },
  newWallet: {
    root: '/new-bitcoin-wallet',
    create: '/new-bitcoin-wallet/create',
    hardware: '/new-bitcoin-wallet/hardware',
    restore: '/new-bitcoin-wallet/restore'
  },
};
