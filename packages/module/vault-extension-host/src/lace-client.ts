// Typed method wrappers over the shared `window.lace` request client
// (@lace-lib/extension-shell-client). This module needs only the
// wallet-ceremony REQUESTS — mount-only surfaces where every input (name,
// mnemonic, password) is typed inside the host and never in this sandboxed
// guest (ADR 36). Capability feature detection uses the shared typed
// `hasLaceCapability` directly.

import { request } from '@lace-lib/extension-shell-client';

import type {
  HwDevice,
  HwPairBlockchain,
  LaceMethodParams,
} from '@lace-lib/extension-shell-api';

export const requestCreateWallet = async (midnightNetwork?: string) =>
  request(
    'wallets.requestCreate',
    midnightNetwork ? { midnightNetwork } : undefined,
  );

export const requestImportWallet = async (midnightNetwork?: string) =>
  request(
    'wallets.requestImport',
    midnightNetwork ? { midnightNetwork } : undefined,
  );

export const requestConnectHardwareWallet = async (
  device: HwDevice,
  blockchain: HwPairBlockchain,
) => request('wallets.requestConnectHardware', { device, blockchain });

// The manager mount hint (view + walletId + accountIndex) is NON-AUTHORITATIVE
// (ADR 36): the host re-validates it and every op still confirms in-surface.
export const requestWalletManager = async (
  params?: LaceMethodParams<'wallets.requestManager'>,
) => request('wallets.requestManager', params);

// The manager's account-rename view. Its own method rather than a
// `requestWalletManager` view hint so the guest can feature-detect it: an older
// host DROPS an unknown view and mounts the plain list instead.
export const requestRenameAccount = async (
  params: LaceMethodParams<'wallets.requestRenameAccount'>,
) => request('wallets.requestRenameAccount', params);
