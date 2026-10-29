/** @vitest-environment jsdom */
import { proofServerDisclosureKey } from '@lace-contract/midnight-context';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProofServerConfirmation } from '../../src/hooks/useProofServerConfirmation';

import type { ProofServerMode } from '@lace-contract/midnight-context';

const mocks = vi.hoisted(() => ({
  acknowledge: vi.fn(),
  acknowledgements: undefined as Record<string, boolean> | undefined,
}));
vi.mock('../../src/hooks/lace-context', () => ({
  useLaceSelector: () => mocks.acknowledgements,
  useDispatchLaceAction: () => mocks.acknowledge,
}));
const local: ProofServerMode = {
  kind: 'local-host',
  url: 'http://localhost:6300',
};
const temenos: ProofServerMode = {
  kind: 'tee-delegated',
  url: 'https://api.proofserver.wastedp.io',
  label: 'Temenos',
};
const props = (): Parameters<typeof useProofServerConfirmation>[0] => ({
  networkId: 'preprod' as const,
  mode: temenos,
  availableModes: [local, temenos],
  isOpen: true,
  isSaving: false,
  onSave: vi.fn(),
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.acknowledgements = undefined;
});

describe('proof-server confirmation', () => {
  it('does not gate opening settings; first remote save requires confirmation', () => {
    const input = props();
    const { result } = renderHook(() => useProofServerConfirmation(input));
    expect(result.current.confirmation).toBeUndefined();
    act(() => {
      result.current.requestSave();
    });
    expect(result.current.confirmation).toEqual({
      isCustom: false,
      provider: 'Temenos',
      isFirstUse: true,
    });
    expect(input.onSave).not.toHaveBeenCalled();
    expect(mocks.acknowledge).not.toHaveBeenCalled();
    act(() => {
      result.current.confirm();
    });
    expect(mocks.acknowledge).toHaveBeenCalledWith(temenos);
    expect(input.onSave).toHaveBeenCalledTimes(1);
    expect(result.current.confirmation).toBeUndefined();
  });

  it('cancel keeps the settings unsaved and does not record acknowledgement', () => {
    const input = props();
    const { result } = renderHook(() => useProofServerConfirmation(input));
    act(() => {
      result.current.requestSave();
    });
    act(() => {
      result.current.cancel();
    });
    expect(result.current.confirmation).toBeUndefined();
    expect(input.onSave).not.toHaveBeenCalled();
    expect(mocks.acknowledge).not.toHaveBeenCalled();
    act(() => {
      result.current.requestSave();
    });
    expect(result.current.confirmation?.isFirstUse).toBe(true);
  });

  it('acknowledged providers still require a lighter confirmation', () => {
    mocks.acknowledgements = { [proofServerDisclosureKey(temenos)!]: true };
    const input = props();
    const { result } = renderHook(() => useProofServerConfirmation(input));
    act(() => {
      result.current.requestSave();
    });
    expect(result.current.confirmation?.isFirstUse).toBe(false);
    expect(input.onSave).not.toHaveBeenCalled();
    act(() => {
      result.current.confirm();
    });
    expect(input.onSave).toHaveBeenCalledTimes(1);
  });

  it('does not reuse acknowledgement for another endpoint', () => {
    mocks.acknowledgements = { [proofServerDisclosureKey(temenos)!]: true };
    const other: ProofServerMode = { ...temenos, url: 'https://other.example' };
    const { result } = renderHook(() =>
      useProofServerConfirmation({
        ...props(),
        mode: other,
        availableModes: [other],
      }),
    );
    act(() => {
      result.current.requestSave();
    });
    expect(result.current.confirmation?.isFirstUse).toBe(true);
  });

  it('on-device proving saves without server consent', () => {
    const mode: ProofServerMode = { kind: 'in-process' };
    const input = { ...props(), mode, availableModes: [mode, temenos] };
    const { result } = renderHook(() => useProofServerConfirmation(input));
    act(() => {
      result.current.requestSave();
    });
    expect(input.onSave).toHaveBeenCalledTimes(1);
    expect(result.current.confirmation).toBeUndefined();
    expect(mocks.acknowledge).not.toHaveBeenCalled();
  });

  it('requires confirmation for Custom even when its endpoint is localhost', () => {
    const input = { ...props(), mode: local };
    const { result } = renderHook(() => useProofServerConfirmation(input));
    act(() => {
      result.current.requestSave();
    });
    expect(result.current.confirmation).toEqual({
      isCustom: true,
      provider: undefined,
      isFirstUse: true,
    });
    expect(input.onSave).not.toHaveBeenCalled();
    act(() => {
      result.current.cancel();
    });
    expect(mocks.acknowledge).not.toHaveBeenCalled();
    expect(input.onSave).not.toHaveBeenCalled();
    act(() => {
      result.current.requestSave();
    });
    act(() => {
      result.current.confirm();
    });
    expect(mocks.acknowledge).toHaveBeenCalledWith(local);
    expect(input.onSave).toHaveBeenCalledTimes(1);
  });

  it('uses a reminder only for the acknowledged Custom endpoint', () => {
    mocks.acknowledgements = { [proofServerDisclosureKey(local)!]: true };
    const other: ProofServerMode = { ...local, url: 'http://localhost:7300' };
    const input = { ...props(), mode: local, availableModes: [local, other] };
    const { result, rerender } = renderHook(
      p => useProofServerConfirmation(p),
      { initialProps: input },
    );
    act(() => {
      result.current.requestSave();
    });
    expect(result.current.confirmation?.isFirstUse).toBe(false);
    rerender({ ...input, mode: other });
    act(() => {
      result.current.confirm();
    });
    expect(input.onSave).not.toHaveBeenCalled();
    act(() => {
      result.current.requestSave();
    });
    expect(result.current.confirmation?.isFirstUse).toBe(true);
  });

  it('invalidates consent when a provider is disabled and cannot resume it on re-enable', () => {
    const input = props();
    const { result, rerender } = renderHook(
      p => useProofServerConfirmation(p),
      { initialProps: input },
    );
    act(() => {
      result.current.requestSave();
    });
    rerender({ ...input, availableModes: [local] });
    act(() => {
      result.current.confirm();
    });
    expect(input.onSave).not.toHaveBeenCalled();
    expect(mocks.acknowledge).not.toHaveBeenCalled();
    rerender(input);
    expect(result.current.confirmation).toBeUndefined();
  });

  it.each(['network', 'provider', 'disclosure-version'] as const)(
    'does not reuse consent after a %s change',
    change => {
      const input = props();
      const { result, rerender } = renderHook(
        p => useProofServerConfirmation(p),
        { initialProps: input },
      );
      if (change === 'disclosure-version') {
        mocks.acknowledgements = {
          'v0:tee-delegated:https://api.proofserver.wastedp.io': true,
        };
        act(() => {
          result.current.requestSave();
        });
        expect(result.current.confirmation?.isFirstUse).toBe(true);
        return;
      }
      act(() => {
        result.current.requestSave();
      });
      rerender(
        change === 'network'
          ? { ...input, networkId: 'preview' }
          : { ...input, mode: local },
      );
      act(() => {
        result.current.confirm();
      });
      expect(input.onSave).not.toHaveBeenCalled();
      expect(mocks.acknowledge).not.toHaveBeenCalled();
      expect(result.current.confirmation).toBeUndefined();
    },
  );

  it('invalidates a pending confirmation after closing settings', () => {
    const input = props();
    const { result, rerender } = renderHook(
      p => useProofServerConfirmation(p),
      { initialProps: input },
    );
    act(() => {
      result.current.requestSave();
    });
    rerender({ ...input, isOpen: false });
    rerender(input);
    act(() => {
      result.current.confirm();
    });
    expect(input.onSave).not.toHaveBeenCalled();
    expect(result.current.confirmation).toBeUndefined();
  });
});
