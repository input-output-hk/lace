import { createSlotTimeCalc } from '@cardano-sdk/core';

import type { EraSummary, Cardano } from '@cardano-sdk/core';

/**
 * Result of converting a slot number to a human-readable date and time.
 */
export interface SlotDateTime {
  /** Date formatted as 'MMM DD, YYYY' (e.g., 'Jan 15, 2024') */
  utcDate: string;
  /** Time formatted as 'HH:MM:SS' (e.g., '14:30:00') */
  utcTime: string;
}

/**
 * Formats a Date object to a string in 'MMM DD, YYYY' format.
 *
 * @param date - The Date object to format
 * @returns Formatted date string (e.g., 'Jan 15, 2024')
 */
const formatUtcDate = (date: Date): string => {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const month = months[date.getUTCMonth()];
  const day = date.getUTCDate().toString().padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${month} ${day}, ${year}`;
};

/**
 * Formats a Date object to a string in 'HH:MM:SS' format.
 *
 * @param date - The Date object to format
 * @returns Formatted time string (e.g., '14:30:00')
 */
const formatUtcTime = (date: Date): string => {
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * Converts a Cardano slot number to a human-readable UTC date and time.
 *
 * Uses era summaries to calculate the absolute time from a slot number.
 * Era summaries define the mapping between slots and real-world time
 * for different Cardano eras.
 *
 * @param slot - The slot number to convert
 * @param eraSummaries - Array of era summaries for time calculation
 * @returns Object containing utcDate and utcTime strings, or null if conversion fails
 */
export const slotToDateTime = (
  slot: Cardano.Slot | undefined,
  eraSummaries: readonly EraSummary[] | undefined,
): SlotDateTime | null => {
  if (slot === undefined || !eraSummaries || eraSummaries.length === 0) {
    return null;
  }

  try {
    const mutableEraSummaries = eraSummaries as EraSummary[];
    const slotTimeCalc = createSlotTimeCalc(mutableEraSummaries);
    const date = slotTimeCalc(slot);

    return {
      utcDate: formatUtcDate(date),
      utcTime: formatUtcTime(date),
    };
  } catch {
    return null;
  }
};
