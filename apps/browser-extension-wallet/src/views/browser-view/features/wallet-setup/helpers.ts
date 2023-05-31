import { Wallet } from '@lace/cardano';

export const isTrezorHWSupported = (): boolean => process.env.USE_TREZOR_HW === 'true';
export const isHardwareWalletAvailable = (wallet: Wallet.HardwareWallets): boolean =>
  wallet !== Wallet.KeyManagement.KeyAgentType.Trezor || isTrezorHWSupported();
