/* eslint-disable no-magic-numbers, sonarjs/no-identical-functions, @typescript-eslint/no-empty-function */
import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';
import { useAsyncSwitchMap } from '../useAsyncSwitchMap';

jest.useFakeTimers();

describe('useAsyncSwitchMap', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  test('calls the callback only for the latest invocation', async () => {
    const mockMapper = jest.fn(async (input: number) => {
      await new Promise((resolve) => setTimeout(resolve, input * 100));
      return input;
    });
    const mockCallback = jest.fn();

    const { result } = renderHook(() => useAsyncSwitchMap(mockMapper, mockCallback));

    act(() => {
      result.current(1);
      result.current(2);
      result.current(3);
    });

    act(() => {
      jest.advanceTimersByTime(250);
    });

    await waitFor(() => expect(mockCallback).toHaveBeenCalledWith(3));

    expect(mockMapper).toHaveBeenCalledTimes(3);
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test('handles errors correctly', async () => {
    const mockMapper = jest.fn(async (input: number) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (input === 2) throw new Error('Test Error');
      return input * 5;
    });
    const mockCallback = jest.fn();

    const { result } = renderHook(() => useAsyncSwitchMap(mockMapper, mockCallback));

    act(() => {
      result.current(1);
      result.current(2);
      result.current(3);
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => expect(mockCallback).toHaveBeenCalledWith(15));
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });
});
