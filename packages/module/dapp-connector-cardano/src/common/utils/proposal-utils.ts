import type { Cardano } from '@cardano-sdk/core';

/**
 * Formats a reward account address for display.
 * The reward account is typically a bech32-encoded stake address.
 *
 * @param rewardAccount - The reward account address
 * @returns Formatted reward account string
 */
export const formatRewardAccount = (
  rewardAccount: Cardano.RewardAccount,
): string => rewardAccount.toString();

/**
 * Formats a deposit amount in lovelace to a display string with coin symbol.
 *
 * @param deposit - The deposit amount in lovelace
 * @param coinSymbol - The coin symbol to display (e.g., "ADA", "tADA")
 * @returns Formatted deposit string (e.g., "2.00 ADA")
 */
export const formatProposalDeposit = (
  deposit: Cardano.Lovelace,
  coinSymbol: string,
): string => {
  const ada = Number(deposit) / 1_000_000;
  const formatted = ada.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
  return `${formatted} ${coinSymbol}`;
};

/**
 * Generates an explorer URL for a governance action ID.
 *
 * @param governanceActionId - The governance action ID containing transaction ID and action index
 * @param explorerBaseUrl - The base URL of the block explorer (e.g., "https://cexplorer.io")
 * @returns Full URL to view the governance action in the explorer, or empty string if no action ID
 */
export const getGovernanceActionExplorerUrl = (
  governanceActionId: Cardano.GovernanceActionId | null,
  explorerBaseUrl: string,
): string => {
  if (!governanceActionId || !explorerBaseUrl) {
    return '';
  }
  return `${explorerBaseUrl}/governance/${governanceActionId.id}#${governanceActionId.actionIndex}`;
};

/**
 * Formats lovelace amount to a human-readable string.
 *
 * @param lovelace - Amount in lovelace
 * @param coinSymbol - The coin symbol to display (e.g., "ADA", "tADA")
 * @returns Formatted string with amount and symbol
 */
export const formatLovelace = (
  lovelace: Cardano.Lovelace,
  coinSymbol: string,
): string => {
  const ada = Number(lovelace) / 1_000_000;
  const formatted = ada.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
  return `${formatted} ${coinSymbol}`;
};

/**
 * Formats a protocol version for display.
 *
 * @param protocolVersion - The protocol version object with major and minor fields
 * @returns Formatted version string (e.g., "9.0" or "9.0.1")
 */
export const formatProtocolVersion = (
  protocolVersion: Pick<Cardano.ProtocolVersion, 'major' | 'minor'>,
): string => {
  const { major, minor } = protocolVersion;
  return `${major}.${minor}`;
};

export { truncateHash } from './format-utils';

/**
 * Formats a Fraction type to a percentage string.
 *
 * @param fraction - The fraction with numerator and denominator
 * @returns Formatted percentage string (e.g., "66.67%")
 */
export const formatFraction = (fraction: Cardano.Fraction): string => {
  if (fraction.denominator === 0) {
    return '0%';
  }
  const percentage = (fraction.numerator / fraction.denominator) * 100;
  return `${percentage.toFixed(2)}%`;
};
