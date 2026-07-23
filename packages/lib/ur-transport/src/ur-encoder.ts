import { Buffer } from 'buffer';

import { UR, UREncoder } from '@ngraveio/bc-ur';

/** Default maximum CBOR bytes per QR fragment, matching the firmware. */
export const DEFAULT_MAX_FRAGMENT_LENGTH = 90;

/**
 * Upper cases an outgoing part string. The UR string encoding is
 * case-insensitive, and its upper-case form fits the QR alphanumeric
 * character set, which packs far more data per module than byte mode,
 * yielding sparser frames that device cameras scan more reliably.
 * Hardware wallets render their own frames upper cased for the same reason.
 */
const toQrAlphanumericForm = (part: string): string => part.toUpperCase();

/** Options controlling how a payload is split into animated-QR parts. */
export interface UrEncoderOptions {
  /** Maximum CBOR bytes per fragment. Defaults to {@link DEFAULT_MAX_FRAGMENT_LENGTH}. */
  maxFragmentLength?: number;
  /**
   * Multiplier on the pure-fragment count, used to emit extra fountain parts so
   * a looping animated QR can be reassembled even when the scanner misses
   * frames. Defaults to 1 (no redundancy). Applied only when the payload spans
   * two or more fragments.
   */
  redundancyRatio?: number;
}

/**
 * A fountain encoder that yields ordered animated-QR part strings. Because UR
 * uses fountain codes, {@link nextPart} can be called indefinitely and will
 * cycle past {@link partCount}, emitting additional redundant parts that aid the
 * receiver under lossy scanning.
 */
export interface UrAnimatedEncoder {
  /** Minimum number of distinct fragments the payload was split into. */
  partCount: number;
  /** Returns the next part string in the animated sequence. */
  nextPart(): string;
}

/**
 * Creates a fountain encoder for an outgoing (urType, cbor) message.
 *
 * The returned encoder generates standard ur:<type>/<seq>/<bytewords> parts,
 * upper cased for QR alphanumeric mode, to be rendered as an animated QR
 * sequence; display timing (fps) is a UI concern handled by the caller.
 */
export const createUrEncoder = (
  urType: string,
  cbor: Uint8Array,
  options: UrEncoderOptions = {},
): UrAnimatedEncoder => {
  const maxFragmentLength =
    options.maxFragmentLength ?? DEFAULT_MAX_FRAGMENT_LENGTH;
  const ur = new UR(Buffer.from(cbor), urType);
  const encoder = new UREncoder(ur, maxFragmentLength);
  return {
    nextPart: () => toQrAlphanumericForm(encoder.nextPart()),
    partCount: encoder.fragmentsLength,
  };
};

/**
 * Encodes a (urType, cbor) payload into a finite ordered list of upper-cased
 * animated-QR parts. By default it emits exactly the pure fragments (no
 * redundancy). Pass
 * redundancyRatio > 1 to append extra fountain parts so a looping animated QR
 * reassembles even when the scanner drops frames.
 */
export const encodeToParts = (
  urType: string,
  cbor: Uint8Array,
  options: UrEncoderOptions = {},
): string[] => {
  const maxFragmentLength =
    options.maxFragmentLength ?? DEFAULT_MAX_FRAGMENT_LENGTH;
  const ur = new UR(Buffer.from(cbor), urType);
  const encoder = new UREncoder(ur, maxFragmentLength);
  const pureParts = encoder.fragmentsLength;
  const ratio = options.redundancyRatio ?? 1;
  const totalParts =
    pureParts < 2
      ? pureParts
      : Math.max(pureParts, Math.ceil(pureParts * ratio));
  return Array.from({ length: totalParts }, () =>
    toQrAlphanumericForm(encoder.nextPart()),
  );
};
