/* eslint-disable unicorn/no-nested-ternary */
/* eslint-disable no-magic-numbers */
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

/**
 * takes the time left in milliseconds and formats it to HH:MM:SS
 */
export const formatCountdown = (timeLeft: number): string => {
  if (timeLeft <= 0) return '00h 00m 00s';

  if (Number.isNaN(timeLeft)) return '-';

  const durationTime = dayjs.duration(timeLeft, 'milliseconds');

  const dateSeconds = durationTime.seconds();
  const dateMinutes = durationTime.minutes();
  const dateHours = durationTime.hours();
  const dateDays = durationTime.days();

  const seconds = dateSeconds < 10 ? `0${dateSeconds}` : dateSeconds;
  const minutes = dateMinutes < 10 ? `0${dateMinutes}` : dateMinutes;
  const hours = dateHours < 10 ? `0${dateHours}` : dateHours;
  const days = dateDays ? `${dateDays}d` : '';

  return `${days} ${hours}h ${minutes}m ${seconds}s`.trim();
};
