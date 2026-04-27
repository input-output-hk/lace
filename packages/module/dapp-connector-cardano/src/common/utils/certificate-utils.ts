import { Cardano } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';

import type { Hash28ByteBase16 } from '@cardano-sdk/crypto';

/**
 * Display information for a DRep.
 * Contains either a DRep ID (bech32) or flags for special DRep types.
 */
export interface DRepDisplayInfo {
  /** DRep ID in bech32 format, if available */
  drepId?: Cardano.DRepID;
  /** True if the DRep is "always abstain" */
  alwaysAbstain: boolean;
  /** True if the DRep is "always no confidence" */
  alwaysNoConfidence: boolean;
}

/**
 * Formats a stake credential into a bech32 reward address.
 *
 * @param networkId - The Cardano network ID
 * @param stakeCredential - The stake credential to format
 * @returns The bech32-encoded reward address
 */
export const formatStakeAddress = (
  networkId: Cardano.NetworkId,
  stakeCredential: Cardano.Credential,
): string =>
  Cardano.RewardAddress.fromCredentials(networkId, stakeCredential)
    .toAddress()
    .toBech32();

/**
 * Formats a stake credential as its raw key/script hash (hex string).
 * Used for display in certificate views where the label is "Stake Key Hash".
 *
 * @param stakeCredential - The stake credential (key hash or script hash)
 * @returns The hex-encoded stake key hash
 */
export const formatStakeKeyHash = (
  stakeCredential: Cardano.Credential,
): string => String(stakeCredential.hash);

/**
 * Converts a DRep credential hash to a bech32-encoded DRep ID.
 *
 * @param hash - The 28-byte hash of the DRep credential
 * @returns The bech32-encoded DRep ID
 */
export const formatDRepId = (hash: Hash28ByteBase16): Cardano.DRepID =>
  Cardano.DRepID(HexBlob.toTypedBech32('drep', HexBlob(hash)));

/**
 * Formats a deposit amount in lovelace to a display string with coin symbol.
 *
 * @param deposit - The deposit amount in lovelace
 * @param coinSymbol - The coin symbol to display (e.g., "ADA", "tADA")
 * @returns Formatted deposit string (e.g., "2.00 ADA")
 */
export const formatDeposit = (deposit: bigint, coinSymbol: string): string => {
  const ada = Number(deposit) / 1_000_000;
  const formatted = ada.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
  return `${formatted} ${coinSymbol}`;
};

/**
 * Extracts display information from a DRep (Delegate Representative).
 * Handles both credential-based DReps and special DReps (alwaysAbstain, alwaysNoConfidence).
 *
 * @param dRep - The delegate representative object from a certificate
 * @returns Display information for the DRep
 */
export const getDRepDisplayInfo = (
  dRep: Cardano.DelegateRepresentative,
): DRepDisplayInfo => ({
  alwaysAbstain: Cardano.isDRepAlwaysAbstain(dRep),
  alwaysNoConfidence: Cardano.isDRepAlwaysNoConfidence(dRep),
  ...(Cardano.isDRepCredential(dRep) && {
    drepId: formatDRepId(dRep.hash),
  }),
});
