/* eslint-disable no-magic-numbers */
import { formatCountdown } from '../format-countdown';

describe('Testing formatCountdown function', () => {
  test('Should return formatted time in HH:MM:SS', () => {
    const formatted = formatCountdown(180_000);
    expect(formatted).toBe('00h 03m 00s');
  });

  test('Should return 24 hours as time left', () => {
    const formatted = formatCountdown(86_400_000);
    expect(formatted).toBe('1d 00h 00m 00s');
  });

  test('Should return 36 hours as time left', () => {
    const formatted = formatCountdown(129_600_000);
    expect(formatted).toBe('1d 12h 00m 00s');
  });

  test('Should return 2 hours as time left', () => {
    const formatted = formatCountdown(7_200_000);
    expect(formatted).toBe('02h 00m 00s');
  });

  test('Should return 13 hours as time left', () => {
    const formatted = formatCountdown(46_800_000);
    expect(formatted).toBe('13h 00m 00s');
  });

  test('Should return 00:00:00 if equal or less than 0', () => {
    const formatted1 = formatCountdown(0);
    const formatted2 = formatCountdown(-1235);

    expect(formatted1).toBe('00h 00m 00s');
    expect(formatted2).toBe('00h 00m 00s');
  });
});
