import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useAuthSecretManager } from '../../src';

describe('useAuthSecretManager', () => {
  it('should initialize with an empty secret', () => {
    const { result } = renderHook(() => useAuthSecretManager());
    expect(result.current.getAuthSecret()).toEqual('');
  });

  it('should set secret when setAuthSecret is called', () => {
    const { result } = renderHook(() => useAuthSecretManager());

    const mockInput = document.createElement('input');
    const secretData = { input: mockInput, value: 'test' };

    act(() => {
      result.current.setAuthSecret(secretData);
    });

    expect(result.current.getAuthSecret()).toEqual(secretData.value);
  });

  it('should clear the secret when clearAuthSecret is called', () => {
    const { result } = renderHook(() => useAuthSecretManager());

    const mockInput = document.createElement('input');
    mockInput.value = 'test';
    const secretData = { input: mockInput, value: 'test' };

    act(() => {
      result.current.setAuthSecret(secretData);
    });

    expect(result.current.getAuthSecret()).toEqual(secretData.value);

    act(() => {
      result.current.clearAuthSecret();
    });

    expect(result.current.getAuthSecret()).toEqual('');
    expect(mockInput.value).toBe('');
  });

  it('should clear the secret on unmount', () => {
    const mockInput = document.createElement('input');
    mockInput.value = 'test';
    const secretData = { input: mockInput, value: 'test' };

    const { result, unmount } = renderHook(() => useAuthSecretManager());

    act(() => {
      result.current.setAuthSecret(secretData);
    });

    expect(result.current.getAuthSecret()).toEqual(secretData.value);

    unmount();

    expect(result.current.getAuthSecret()).toEqual('');
    expect(mockInput.value).toBe('');
  });
});
