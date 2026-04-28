import type { MidnightCoinDetail } from './types';

export type DesignationTargetType = 'external' | 'none' | 'self';

/**
 * Determines the designation target type based on NIGHT coin registration and dust balance.
 *
 * TODO: Update when SDK supports distinguishing self vs external designation.
 * Currently, the SDK's `registeredForDustGeneration` flag only indicates that NIGHT is
 * participating in dust generation, but does not specify the target dust address.
 * Until SDK provides this information, we treat all designation as 'self'.
 *
 * @returns 'self' when user has designation (registered NIGHT or dust balance), 'none' otherwise.
 * Note: 'external' is not returned until SDK supports proper detection.
 */
export const getDesignationTargetType = (
  coins: MidnightCoinDetail[],
  currentDustValue: bigint,
): DesignationTargetType => {
  const hasRegisteredNight = coins.some(
    coin => coin.registeredForDustGeneration === true,
  );
  const isDesignated = hasRegisteredNight || currentDustValue > 0n;

  return isDesignated ? 'self' : 'none';
};

export type TimeRemainingParams = {
  currentValue: bigint;
  maxCap: bigint;
  maxCapReachedAt: number | undefined;
  rate: bigint;
};

export const formatDustTime = (seconds: number): string | undefined => {
  if (seconds <= 0) return undefined;
  if (seconds < 60) return '<1min';

  const totalHours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (totalHours > 0) {
    return minutes > 0 ? `${totalHours}h${minutes}min` : `${totalHours}h`;
  }

  return `${minutes}min`;
};

/**
 * Calculates time remaining in seconds for dust generation or decay.
 *
 * Uses SDK's pre-calculated maxCapReachedAt timestamp for both:
 * - Refilling (currentValue < maxCap): Time until dust reaches maxCap
 * - Decaying (currentValue > maxCap): Time until dust decays to maxCap
 *
 * @see https://github.com/midnightntwrk/midnight-wallet - SDK source for dust generation formulas
 */
export const calculateDustTimeRemainingSeconds = ({
  currentValue,
  maxCap,
  maxCapReachedAt,
  rate,
}: TimeRemainingParams): number => {
  if (rate === 0n || currentValue === maxCap) return 0;
  if (maxCapReachedAt === undefined) return 0;

  const now = Date.now();
  return Math.max(0, Math.floor((maxCapReachedAt - now) / 1000));
};
