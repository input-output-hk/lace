/* eslint-disable no-magic-numbers */
import { useCountdown } from '../useCountdown';
import { renderHook, act } from '@testing-library/react-hooks';

jest.useFakeTimers();

describe('Testing useCountdown hook', () => {
  test('Should initialize hook with countdown', async () => {
    act(() => {
      const { result } = renderHook(() => useCountdown(Date.now() + 10_000));
      expect(result.current).toBeDefined();
      expect(result.current.countdown).toBe('00h 00m 10s');
      expect(result.current.hasCountdownFinished).toBe(false);
    });
  });
  test('Should return countdown in 00:00:00 when passed 0 as argument', async () => {
    act(() => {
      const { result } = renderHook(() => useCountdown(0));
      expect(result.current.countdown).toBe('00h 00m 00s');
      expect(result.current.hasCountdownFinished).toBe(true);
    });
  });
});
