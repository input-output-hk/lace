/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */
import { renderHook } from '@testing-library/react-hooks';
import { useKeyboardShortcut } from '../useKeyboardShortcut';

describe('Testing useKeyboardShortcut hook', () => {
  test('should call the cb function', () => {
    const cb = jest.fn();
    const hook = renderHook((active = true) => useKeyboardShortcut(['Enter', 'Escape'], cb, !!active));

    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }));
    expect(cb).toBeCalled();

    cb.mockReset();
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
    expect(cb).toBeCalled();

    cb.mockReset();
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    expect(cb).not.toBeCalled();

    hook.rerender(false);

    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }));
    expect(cb).not.toBeCalled();

    cb.mockReset();
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
    expect(cb).not.toBeCalled();

    cb.mockReset();
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    expect(cb).not.toBeCalled();
  });
});
