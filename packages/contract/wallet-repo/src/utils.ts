import { WalletType } from './types';

import type { AnyWallet, HardwareWallet, HardwareWalletTrezor } from './types';

export const isHardwareWallet = (wallet: AnyWallet): wallet is HardwareWallet =>
  wallet.type === WalletType.HardwareLedger ||
  wallet.type === WalletType.HardwareTrezor;

export const isTrezorWallet = (
  wallet: AnyWallet,
): wallet is HardwareWalletTrezor => wallet.type === WalletType.HardwareTrezor;
