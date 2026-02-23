/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-magic-numbers */
import { renderHook } from '@testing-library/react-hooks';
import { useNetwork } from '../useNetwork';
import { act } from 'react-dom/test-utils';

window = Object.create(window);
Object.defineProperty(window, 'navigator', {
  value: {
    ...window.navigator,
    onLine: true
  },
  writable: true // possibility to override
});

describe('Testing useNetwork hook', () => {
  test('should return proper network state', async () => {
    const hook = renderHook(() => useNetwork());
    expect(hook.result.current.isOnline).toEqual(true);

    act(() => {
      (window.navigator as any).onLine = false;
      window.dispatchEvent(new Event('offline'));
    });
    expect(hook.result.current.isOnline).toEqual(false);

    act(() => {
      (window.navigator as any).onLine = false;
      window.dispatchEvent(new Event('offline'));
    });
    expect(hook.result.current.isOnline).toEqual(false);
  });
});
