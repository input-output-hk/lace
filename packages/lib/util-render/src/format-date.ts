import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import type { Timestamp } from '@lace-sdk/util';

dayjs.extend(utc);

export const DEFAULT_DATE_FORMAT = 'MM/DD/YYYY';
export const DEFAULT_TIME_FORMAT = 'HH:mm:ss';

type FormatDateTimeParams = {
  date: Date | Timestamp | number | string;
  format?: string;
  type: 'local' | 'utc';
};

const formatDateTime = ({
  date,
  format,
  type,
}: FormatDateTimeParams): string => {
  const dayJsDate = type === 'utc' ? dayjs(date).utc() : dayjs(date);

  return dayJsDate.format(format ?? DEFAULT_DATE_FORMAT);
};

export const formatDate = ({
  date,
  format,
  type,
}: FormatDateTimeParams): string =>
  formatDateTime({ date, format: format ?? DEFAULT_DATE_FORMAT, type });

export const formatTime = ({
  date,
  format,
  type,
}: FormatDateTimeParams): string =>
  formatDateTime({ date, format: format ?? DEFAULT_TIME_FORMAT, type });

/**
 * Formats a timestamp (in milliseconds) as a countdown string showing remaining time.
 * Returns format "nd nh nm ns" (e.g., "6m 34s") where n are numbers.
 * Removes non-significant zeros (e.g., "6m 34s" instead of "0d 0h 6m 34s").
 * Returns "0s" if the timestamp is in the past.
 *
 * @param timestamp - The target timestamp in milliseconds
 * @returns Formatted countdown string (e.g., "2d 5h 30m 15s" or "0s")
 */
export const formatEpochEnd = (timestamp: number): string => {
  const now = Date.now();
  const diffMs = timestamp - now;

  if (diffMs <= 0) {
    return '0s';
  }

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const remainingSeconds = seconds % 60;
  const remainingMinutes = minutes % 60;
  const remainingHours = hours % 24;

  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (days > 0 || remainingHours > 0) parts.push(`${remainingHours}h`);
  if (days > 0 || remainingHours > 0 || remainingMinutes > 0)
    parts.push(`${remainingMinutes}m`);
  parts.push(`${remainingSeconds}s`);

  // If no parts were added (all zeros), return "0s"
  return parts.length > 0 ? parts.join(' ') : '0s';
};
