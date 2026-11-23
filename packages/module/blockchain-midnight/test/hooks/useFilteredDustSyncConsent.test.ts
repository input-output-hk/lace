/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useFilteredDustSyncConsent } from '../../src/hooks/useFilteredDustSyncConsent';

import type { ProofServerMode } from '@lace-contract/midnight-context';

type Props = Parameters<typeof useFilteredDustSyncConsent>[0];
const mode: ProofServerMode = { kind: 'in-process' };
const props = (): Props => ({
  networkId: 'preprod',
  indexerAddress: 'https://indexer.example',
  proofServer: mode,
  availableProofServerModes: [mode],
  isOpen: true,
  isSaving: false,
  isRolloutEnabled: true,
  isSelected: true,
  hasSettingChanged: true,
  onSave: vi.fn(),
});

describe('filtered Dust sync consent', () => {
  it('saves only after consent when enabling filtering', () => {
    const initial = props();
    const { result } = renderHook(() => useFilteredDustSyncConsent(initial));
    act(() => {
      result.current.requestSave();
    });
    expect(result.current.isAwaitingConsent).toBe(true);
    expect(initial.onSave).not.toHaveBeenCalled();
    act(() => {
      result.current.confirm();
    });
    expect(initial.onSave).toHaveBeenCalledOnce();
    expect(result.current.isAwaitingConsent).toBe(false);
  });
  it.each<Partial<Props>>([
    { networkId: 'preview' },
    { indexerAddress: 'https://replacement.example' },
    { proofServer: { kind: 'local-host', url: 'http://localhost:6300' } },
    { availableProofServerModes: [] },
    { isOpen: false },
    { isSaving: true },
    { isRolloutEnabled: false },
    { isSelected: false },
    { hasSettingChanged: false },
  ])('invalidates consent when settings change: %j', changed => {
    const initial = props();
    const { result, rerender } = renderHook(useFilteredDustSyncConsent, {
      initialProps: initial,
    });
    act(() => {
      result.current.requestSave();
    });
    rerender({ ...initial, ...changed });
    expect(result.current.isAwaitingConsent).toBe(false);
    act(() => {
      result.current.confirm();
    });
    expect(initial.onSave).not.toHaveBeenCalled();
    rerender(initial);
    expect(result.current.isAwaitingConsent).toBe(false);
  });
  it('cancels without saving', () => {
    const initial = props();
    const { result } = renderHook(() => useFilteredDustSyncConsent(initial));
    act(() => {
      result.current.requestSave();
    });
    act(() => {
      result.current.cancel();
    });
    act(() => {
      result.current.confirm();
    });
    expect(initial.onSave).not.toHaveBeenCalled();
  });
  it.each<Partial<Props>>([
    { isSelected: false },
    { hasSettingChanged: false },
  ])(
    'does not request consent when filtering is not newly enabled: %j',
    changed => {
      const initial = { ...props(), ...changed };
      const { result } = renderHook(() => useFilteredDustSyncConsent(initial));
      act(() => {
        result.current.requestSave();
      });
      expect(initial.onSave).toHaveBeenCalledOnce();
      expect(result.current.isAwaitingConsent).toBe(false);
    },
  );
  it('does not enable filtering while its rollout is disabled', () => {
    const initial = { ...props(), isRolloutEnabled: false };
    const { result } = renderHook(() => useFilteredDustSyncConsent(initial));
    act(() => {
      result.current.requestSave();
    });
    expect(initial.onSave).not.toHaveBeenCalled();
    expect(result.current.isAwaitingConsent).toBe(false);
  });
});
