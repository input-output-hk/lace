import type { WalletId } from './wallet-id.vo';
import type { Tagged } from 'type-fest';

const SEED_SIGNER_HW_PREFIX = 'seed-signer-';
const XFP_PATTERN = /^[0-9a-f]{8}$/;

/**
 * Wallet ID for an air-gapped Seed Signer, derived from the device master
 * fingerprint (xfp) rather than a USB/BLE descriptor or an account xpub. Keying
 * on the xfp groups every account of one physical device under a single wallet,
 * across blockchains and across mainnet/testnet (whose xpubs differ).
 *
 * Takes a plain 8-character lowercase-hex string so this stays blockchain
 * agnostic (the MasterFingerprint value object lives in cardano-context, which
 * wallet-repo must not depend on).
 */
export type HardwareSeedSignerWalletId = Tagged<
  WalletId,
  'HardwareSeedSignerWalletId'
>;

export const HardwareSeedSignerWalletId = (
  xfpHex: string,
): HardwareSeedSignerWalletId => {
  const normalized = xfpHex.toLowerCase();
  if (!XFP_PATTERN.test(normalized)) {
    throw new Error(
      `Seed Signer wallet id requires an 8 hex character master fingerprint, got "${xfpHex}"`,
    );
  }
  return `${SEED_SIGNER_HW_PREFIX}${normalized}` as HardwareSeedSignerWalletId;
};
