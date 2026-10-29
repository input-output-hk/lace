// The canary root entry's `m` namespace: the Cardano modules of the stable
// root, and the Bitcoin chain, provider and fee market.
export {
  bitcoinMempoolFeeMarket,
  bitcoinProviderMaestro,
  blockchainBitcoin,
} from './bitcoin/modules';
export * from './modules-cardano';
