/**
 * Converts a given date to its equivalent UTC date.
 * The function calculates the UTC date by adding the offset of the current timezone to the input date.
 * Note that the input date is expected to be in the local timezone.
 *
 * @param date - The input date to be converted to UTC.
 * @returns The UTC date equivalent to the input date.
 *
 * @example
 * // Assuming the local timezone offset is UTC-05:00
 * const inputDate = new Date('2023-08-01T12:00:00'); // August 1, 2023, 12:00:00 (local time)
 * const utcDate = convertToUTC(inputDate);
 * // utcDate will be equivalent to '2023-08-01T17:00:00' (UTC time)
 *
 * @remarks
 * The formula for converting to UTC is based on the fact that JavaScript Date objects
 * store dates as the number of milliseconds since January 1, 1970, 00:00:00 UTC.
 * To calculate the UTC date from a local date, we add the offset of the local timezone in minutes
 * (obtained using `date.getTimezoneOffset()`) multiplied by 60,000 milliseconds (60 seconds * 1000 milliseconds)
 * to the input date's timestamp. This ensures that the output date reflects the correct UTC equivalent.
 */
// eslint-disable-next-line func-style
export function convertToUTC(date: Date): Date {
  // Calculate the UTC date by adding the offset of the current timezone to the input date.
  const MINUTE = 60_000; // 60 seconds * 1000 milliseconds
  const timezoneOffset = date.getTimezoneOffset() * MINUTE;
  return new Date(date.getTime() + timezoneOffset);
}
