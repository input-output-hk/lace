/* eslint-disable no-magic-numbers */
import { getTimeLeft } from '../get-time-left';

describe('Testing getTimeLeft function', () => {
  test('Should return time left from now to given date in milliseconds', () => {
    const currentDate = Date.now();
    const endDate = currentDate + 120_000;

    const parsedTimeLeft = getTimeLeft(endDate, currentDate);
    expect(parsedTimeLeft).toBe(120_000);
  });

  test('Should return 0 if the current date is more recent than the end date', () => {
    const endDate = Date.now();
    const currentDate = endDate + 120_000;

    const parsedTimeLeft = getTimeLeft(endDate, currentDate);
    expect(parsedTimeLeft).toBe(0);
  });
});
