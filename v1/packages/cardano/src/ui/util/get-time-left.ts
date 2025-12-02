import dayjs from 'dayjs';

/**
 * receives the dates and calculate the time left to the end date from the start date.
 * returns time left in milliseconds
 * @param endTime milliseconds
 * @param startTime milliseconds, not required, If is not given will use the current date
 */
export const getTimeLeft = (endTime: string | number | Date, startTime?: string | number | Date): number => {
  const endDate = dayjs(endTime);
  const startDate = dayjs(startTime);
  const timeLeftInMilliseconds = endDate.diff(startDate);
  return timeLeftInMilliseconds >= 0 ? timeLeftInMilliseconds : 0;
};
