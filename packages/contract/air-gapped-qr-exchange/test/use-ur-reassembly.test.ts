/**
 * @vitest-environment jsdom
 */
import { useUrReassembly } from '@lace-lib/ui-toolkit/src/design-system/templates/sheets/urScannerSheet/useUrReassembly';
import { encodeToParts } from '@lace-lib/ur-transport';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { UrPartDecoder } from '@lace-lib/ur-transport';

const mocks = vi.hoisted(() => ({
  decoderFactory: {
    value: undefined as (() => Partial<UrPartDecoder>) | undefined,
  },
}));

vi.mock('@lace-lib/ur-transport', async importOriginal => {
  const actual = await importOriginal<{
    createUrDecoder: () => UrPartDecoder;
  }>();
  return {
    ...actual,
    createUrDecoder: () =>
      mocks.decoderFactory.value
        ? (mocks.decoderFactory.value() as UrPartDecoder)
        : actual.createUrDecoder(),
  };
});

const URTYPE = 'cardano-sign-response';
const PAYLOAD = Uint8Array.from(
  { length: 260 },
  (_, index) => (index * 7 + 13) % 256,
);
const MAX_FRAGMENT_LENGTH = 90;

const buildParts = (): string[] =>
  encodeToParts(URTYPE, PAYLOAD, { maxFragmentLength: MAX_FRAGMENT_LENGTH });

const renderReassembly = (
  onComplete: ReturnType<typeof vi.fn>,
  onError: ReturnType<typeof vi.fn> = vi.fn(),
) => renderHook(() => useUrReassembly({ onComplete, onError }));

const feed = (
  result: ReturnType<typeof renderReassembly>['result'],
  frames: string[],
) => {
  act(() => {
    for (const frame of frames) {
      result.current.receiveFrame(frame);
    }
  });
};

describe('useUrReassembly bad frames', () => {
  it('ignores an undecodable frame and completes from subsequent good frames', () => {
    const onComplete = vi.fn();
    const onError = vi.fn();
    const { result } = renderReassembly(onComplete, onError);
    const parts = buildParts();
    expect(parts.length).toBeGreaterThan(1);

    feed(result, [
      parts[0],
      'https://example.com/not-a-ur-code',
      ...parts.slice(1),
    ]);

    expect(onError).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({
      urType: URTYPE,
      cbor: PAYLOAD,
    });
    expect(result.current.isComplete).toBe(true);
  });

  it('preserves accumulated multi-part progress across an undecodable frame', () => {
    const onComplete = vi.fn();
    const { result } = renderReassembly(onComplete);
    const parts = buildParts();

    feed(result, [parts[0]]);
    const progressAfterFirstPart = result.current.progress;
    expect(progressAfterFirstPart).toBeGreaterThan(0);

    feed(result, ['garbage-frame']);

    expect(result.current.progress).toBe(progressAfterFirstPart);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('recovers when a malformed UR-scheme frame poisons a fresh decoder', () => {
    const onComplete = vi.fn();
    const onError = vi.fn();
    const { result } = renderReassembly(onComplete, onError);

    feed(result, ['ur:crypto-psbt/xxnotvalidbytewordsxx']);
    expect(onError).not.toHaveBeenCalled();

    feed(result, buildParts());

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(result.current.isComplete).toBe(true);
  });
});

describe('useUrReassembly rejected completion', () => {
  it('resumes scanning with a fresh decoder when onComplete returns false', () => {
    const onComplete = vi.fn().mockReturnValueOnce(false);
    const onError = vi.fn();
    const { result } = renderReassembly(onComplete, onError);

    feed(result, buildParts());

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(result.current.isComplete).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(onError).not.toHaveBeenCalled();

    feed(result, buildParts());

    expect(onComplete).toHaveBeenCalledTimes(2);
    expect(result.current.isComplete).toBe(true);
  });

  it('latches completion when onComplete accepts the payload', () => {
    const onComplete = vi.fn();
    const { result } = renderReassembly(onComplete);

    feed(result, buildParts());
    expect(result.current.isComplete).toBe(true);

    feed(result, buildParts());

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe('useUrReassembly terminal failure', () => {
  it('reports a terminal decoder failure through onError once and stops feeding', () => {
    mocks.decoderFactory.value = () => ({
      receivePart: () => ({ complete: false, progress: 0.5 }),
      progress: () => 0.5,
      failureMessage: () => 'UR decode failed: checksum mismatch',
    });
    try {
      const onComplete = vi.fn();
      const onError = vi.fn();
      const { result } = renderReassembly(onComplete, onError);

      feed(result, ['ur:cardano-sign-response/whatever']);
      feed(result, ['ur:cardano-sign-response/whatever']);

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        'UR decode failed: checksum mismatch',
      );
      expect(onComplete).not.toHaveBeenCalled();
      expect(result.current.isComplete).toBe(false);
    } finally {
      mocks.decoderFactory.value = undefined;
    }
  });
});
