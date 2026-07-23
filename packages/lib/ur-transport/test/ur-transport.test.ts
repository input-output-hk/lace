import { describe, expect, it } from 'vitest';

import { createUrDecoder, createUrEncoder, encodeToParts } from '../src';

const buildPayload = (length: number): Uint8Array =>
  Uint8Array.from({ length }, (_, index) => (index * 7 + 13) % 256);

const URTYPE = 'bytes';
const PAYLOAD_LENGTH = 260;
const MAX_FRAGMENT_LENGTH = 90;

describe('createUrEncoder / UrPartDecoder round-trip', () => {
  it('splits a >200 byte payload into multiple fragments', () => {
    const encoder = createUrEncoder(URTYPE, buildPayload(PAYLOAD_LENGTH), {
      maxFragmentLength: MAX_FRAGMENT_LENGTH,
    });
    expect(encoder.partCount).toBeGreaterThan(1);
  });

  it('emits parts carrying the ur:<type>/ prefix', () => {
    const encoder = createUrEncoder(URTYPE, buildPayload(PAYLOAD_LENGTH), {
      maxFragmentLength: MAX_FRAGMENT_LENGTH,
    });
    expect(encoder.nextPart()).toContain(`UR:${URTYPE.toUpperCase()}/`);
  });

  it('emits only upper-case parts from encodeToParts', () => {
    const parts = encodeToParts(URTYPE, buildPayload(PAYLOAD_LENGTH), {
      maxFragmentLength: MAX_FRAGMENT_LENGTH,
    });
    for (const part of parts) {
      expect(part).toBe(part.toUpperCase());
    }
  });

  it('emits only upper-case parts from createUrEncoder', () => {
    const encoder = createUrEncoder(URTYPE, buildPayload(PAYLOAD_LENGTH), {
      maxFragmentLength: MAX_FRAGMENT_LENGTH,
    });
    for (let index = 0; index < encoder.partCount; index++) {
      const part = encoder.nextPart();
      expect(part).toBe(part.toUpperCase());
    }
  });

  it('reassembles in-order parts preserving urType and cbor bytes', () => {
    const payload = buildPayload(PAYLOAD_LENGTH);
    const parts = encodeToParts(URTYPE, payload, {
      maxFragmentLength: MAX_FRAGMENT_LENGTH,
    });
    const decoder = createUrDecoder();

    let last = decoder.receivePart(parts[0]);
    for (let index = 1; index < parts.length; index++) {
      last = decoder.receivePart(parts[index]);
    }

    expect(last.complete).toBe(true);
    const result = decoder.result();
    expect(result.urType).toBe(URTYPE);
    expect(result.cbor).toEqual(payload);
  });

  it('reassembles parts regardless of letter case', () => {
    const payload = buildPayload(PAYLOAD_LENGTH);
    const parts = encodeToParts(URTYPE, payload, {
      maxFragmentLength: MAX_FRAGMENT_LENGTH,
    });
    const casings: Array<(part: string, index: number) => string> = [
      part => part.toLowerCase(),
      part => part.toUpperCase(),
      (part, index) => (index % 2 === 0 ? part.toLowerCase() : part),
    ];

    for (const applyCasing of casings) {
      const decoder = createUrDecoder();
      for (const [index, part] of parts.entries()) {
        decoder.receivePart(applyCasing(part, index));
      }

      expect(decoder.isComplete()).toBe(true);
      const result = decoder.result();
      expect(result.urType).toBe(URTYPE);
      expect(result.cbor).toEqual(payload);
    }
  });

  it('reports progress increasing toward completion', () => {
    const payload = buildPayload(PAYLOAD_LENGTH);
    const parts = encodeToParts(URTYPE, payload, {
      maxFragmentLength: MAX_FRAGMENT_LENGTH,
    });
    const decoder = createUrDecoder();

    const progresses = parts.map(part => decoder.receivePart(part).progress);

    expect(progresses[0]).toBeGreaterThanOrEqual(0);
    expect(progresses[progresses.length - 1]).toBe(1);
    for (let index = 1; index < progresses.length; index++) {
      expect(progresses[index]).toBeGreaterThanOrEqual(progresses[index - 1]);
    }
  });

  it('reassembles out-of-order and duplicated parts', () => {
    const payload = buildPayload(PAYLOAD_LENGTH);
    const parts = encodeToParts(URTYPE, payload, {
      maxFragmentLength: MAX_FRAGMENT_LENGTH,
    });
    const reversedWithDuplicates = [...parts]
      .reverse()
      .flatMap(part => [part, part]);
    const decoder = createUrDecoder();

    for (const part of reversedWithDuplicates) {
      decoder.receivePart(part);
    }

    expect(decoder.isComplete()).toBe(true);
    const result = decoder.result();
    expect(result.urType).toBe(URTYPE);
    expect(result.cbor).toEqual(payload);
  });

  it('reassembles using redundant fountain parts beyond partCount', () => {
    const payload = buildPayload(PAYLOAD_LENGTH);
    const encoder = createUrEncoder(URTYPE, payload, {
      maxFragmentLength: MAX_FRAGMENT_LENGTH,
    });
    const decoder = createUrDecoder();

    let received = 0;
    const maxParts = encoder.partCount * 10;
    while (!decoder.isComplete() && received < maxParts) {
      decoder.receivePart(encoder.nextPart());
      received += 1;
    }

    expect(decoder.isComplete()).toBe(true);
    expect(received).toBeGreaterThanOrEqual(encoder.partCount);
    const result = decoder.result();
    expect(result.urType).toBe(URTYPE);
    expect(result.cbor).toEqual(payload);
  });

  it('emits only the pure fragments by default', () => {
    const payload = buildPayload(PAYLOAD_LENGTH);
    const pureParts = createUrEncoder(URTYPE, payload, {
      maxFragmentLength: MAX_FRAGMENT_LENGTH,
    }).partCount;
    const parts = encodeToParts(URTYPE, payload, {
      maxFragmentLength: MAX_FRAGMENT_LENGTH,
    });
    expect(parts.length).toBe(pureParts);
  });

  it('appends redundant fountain parts when redundancyRatio > 1 and still reassembles', () => {
    const payload = buildPayload(PAYLOAD_LENGTH);
    const pureParts = createUrEncoder(URTYPE, payload, {
      maxFragmentLength: MAX_FRAGMENT_LENGTH,
    }).partCount;
    const parts = encodeToParts(URTYPE, payload, {
      maxFragmentLength: MAX_FRAGMENT_LENGTH,
      redundancyRatio: 2,
    });
    expect(parts.length).toBe(pureParts * 2);

    const decoder = createUrDecoder();
    for (const part of parts) {
      decoder.receivePart(part);
    }
    expect(decoder.isComplete()).toBe(true);
    expect(decoder.result().cbor).toEqual(payload);
  });

  it('throws when result is requested before completion', () => {
    const payload = buildPayload(PAYLOAD_LENGTH);
    const parts = encodeToParts(URTYPE, payload, {
      maxFragmentLength: MAX_FRAGMENT_LENGTH,
    });
    const decoder = createUrDecoder();
    decoder.receivePart(parts[0]);

    expect(decoder.isComplete()).toBe(false);
    expect(() => decoder.result()).toThrow('UR stream is not complete');
  });

  it('reports no failure while decoding can still succeed', () => {
    const payload = buildPayload(PAYLOAD_LENGTH);
    const parts = encodeToParts(URTYPE, payload, {
      maxFragmentLength: MAX_FRAGMENT_LENGTH,
    });
    const decoder = createUrDecoder();

    expect(decoder.failureMessage()).toBeUndefined();
    for (const part of parts) {
      decoder.receivePart(part);
    }
    expect(decoder.failureMessage()).toBeUndefined();
  });

  it('reports the failure message once the underlying decoder is in error', () => {
    const decoder = createUrDecoder();
    (decoder as unknown as { decoder: { error?: Error } }).decoder.error =
      new Error('Invalid Scheme');

    expect(decoder.failureMessage()).toBe('Invalid Scheme');
  });
});
