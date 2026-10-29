// This module has no UI or native addons. The SDK needs its sync side effects
// to turn new wallet accounts into discovered addresses and UTXOs.
export { cardanoSyncModule as default } from './module';
