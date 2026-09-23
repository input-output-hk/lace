/**
 * @vitest-environment jsdom
 */
import { useUrReassembly } from '@lace-lib/ui-toolkit/src/design-system/templates/sheets/urScannerSheet/useUrReassembly';
import { createUrDecoder, encodeToParts } from '@lace-lib/ur-transport';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { UrReassemblyDecoder } from '@lace-lib/ui-toolkit/src/design-system/templates/sheets/urScannerSheet/useUrReassembly';
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

/**
 * The real decoder plus a `canAccept` that answers on UR type, as the next
 * stack's decoder does. Built here because ui-toolkit cannot import that
 * package and the legacy default answers nothing.
 */
const typeAwareDecoder = (): UrReassemblyDecoder => {
  const inner = createUrDecoder();
  let expected: string | undefined;
  const typeOf = (part: string) => part.toLowerCase().split('/')[0].slice(3);
  return {
    receivePart: part => {
      expected ??= typeOf(part);
      return inner.receivePart(part);
    },
    canAccept: part => expected === undefined || typeOf(part) === expected,
    progress: () => inner.progress(),
    failureMessage: () => inner.failureMessage(),
    result: () => inner.result(),
  };
};

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

describe('useUrReassembly latched decoder', () => {
  it('replaces a decoder that reports it cannot accept the frame, and refeeds it', () => {
    const onComplete = vi.fn();
    // A decoder that answers `canAccept` — what the next stack's does. The
    // legacy default deliberately does not, so the hook's own reaction is what
    // is under test here, not the type rule that produces the answer.
    const { result } = renderHook(() =>
      useUrReassembly({ createDecoder: typeAwareDecoder, onComplete }),
    );
    const stale = encodeToParts(
      'bytes',
      Uint8Array.from({ length: 400 }, () => 1),
      { maxFragmentLength: MAX_FRAGMENT_LENGTH },
    );
    const payload = Uint8Array.from({ length: 40 }, (_, index) => index);
    const live = encodeToParts('crypto-hdkey', payload);
    // The whole point: one frame. The camera's re-reads are dropped as
    // duplicates, so the stalled-frame budget can never see a second one.
    expect(live).toHaveLength(1);

    feed(result, [stale[0], live[0]]);

    expect(onComplete).toHaveBeenCalledWith({
      urType: 'crypto-hdkey',
      cbor: payload,
    });
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
