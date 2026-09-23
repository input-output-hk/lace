import { createUrDecoder } from '@lace-lib/ur-transport';
import { useCallback, useMemo, useRef, useState } from 'react';

import type { UrReceiveResult, UrResult } from '@lace-lib/ur-transport';

/** Re-export so consumers do not need a direct transport-lib import. */
export type { UrResult } from '@lace-lib/ur-transport';

/**
 * The subset of the part decoder this hook drives. Structural, so a consumer
 * that owns a different UR stack can inject its own implementation — see
 * {@link UseUrReassemblyProps.createDecoder}.
 */
export interface UrReassemblyDecoder {
  receivePart(part: string): UrReceiveResult;
  /**
   * Whether this decoder could still accept `part`. Optional: a decoder that
   * cannot answer keeps the stalled-frame budget below as its only recovery,
   * which is what the legacy default does — `@lace-lib/core` is vendored into
   * the extension shell under ADR-37, so it is gated separately from here.
   */
  canAccept?(part: string): boolean;
  progress(): number;
  failureMessage(): string | undefined;
  result(): UrResult;
}

export interface UseUrReassemblyProps {
  /**
   * Called once the animated-QR stream reassembles into a complete payload.
   * Return false to reject the payload (e.g. an unexpected UR type); the
   * decoder is replaced and scanning resumes.
   */
  onComplete: (result: UrResult) => boolean | void;
  /** Called when reassembly fails irrecoverably. */
  onError?: (message: string) => void;
  /**
   * Supplies the part decoder; defaults to this lib's own. An app that owns a
   * different UR stack injects its decoder here so ONE reassembly
   * implementation runs per app — fountain reassembly has real subtleties, and
   * two live copies drift.
   */
  createDecoder?: () => UrReassemblyDecoder;
}

export interface UseUrReassembly {
  /** Reassembly progress in the range 0..1. */
  progress: number;
  /** Whether the payload has been fully reassembled. */
  isComplete: boolean;
  /**
   * Feeds one scanned QR string into the reassembly decoder. Platform capture
   * layers and tests/stories call this for every detected frame; it is the
   * shared seam that keeps capture and reassembly decoupled.
   */
  receiveFrame: (frame: string) => void;
  /** Discards accumulated parts so a new stream can be scanned. */
  reset: () => void;
}

/**
 * Holds a single {@link createUrDecoder} instance across renders and feeds it
 * scanned QR strings, exposing reassembly progress and resolving with the
 * decoded (urType, cbor) result. Capture (camera vs injected frames) is
 * deliberately external so this logic is shared by mobile, web and stories.
 */
/**
 * How many valid-but-fruitless frames replace the decoder.
 *
 * bc-ur's fountain decoder latches onto the FIRST valid part's checksum and
 * SILENTLY rejects mismatched parts — no error, no progress. A device still
 * showing its previous response's QR is a realistic first read, and a latched
 * decoder would freeze reassembly until Cancel. Every ACCEPTED distinct part
 * advances bc-ur's progress below its 0.99 cap, so — with the per-decoder
 * frame dedup below, which keeps a camera's re-reads out of the count — a
 * valid frame that advances nothing is the live stream being rejected: after a
 * few of them the decoder is replaced and they are replayed into it. Mirrors
 * the extension scanner bridge's recovery.
 */
const STALLED_FRAME_LIMIT = 3;

/**
 * The budget at bc-ur's 0.99 progress cap, where even an ACCEPTED part
 * advances nothing — so a frozen number is weak evidence of rejection, but
 * never none: an unconditional pass here left a decoder latched at the cap
 * unrecoverable. A healthy stream at the cap completes within a part or two,
 * so a much larger budget keeps false resets implausible.
 */
const CAPPED_STALLED_FRAME_LIMIT = 24;

export const useUrReassembly = ({
  onComplete,
  onError,
  createDecoder = createUrDecoder,
}: UseUrReassemblyProps): UseUrReassembly => {
  const decoderRef = useRef<UrReassemblyDecoder>(createDecoder());
  const hasCompletedRef = useRef(false);
  const lastProgressRef = useRef(0);
  const stalledFramesRef = useRef<string[]>([]);
  /**
   * Frames already fed to the CURRENT decoder. The camera re-reads each
   * displayed frame many times, and bc-ur counts accepted duplicates toward
   * its progress estimate — without this dedup a duplicate-heavy stream pins
   * the 0.99 cap after a fraction of the DISTINCT parts, and the cap budget
   * then destroys a healthy decoder mid-reassembly. Scoped per decoder
   * lifetime so a replacement's replay is not filtered out.
   */
  const seenFramesRef = useRef(new Set<string>());
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const replaceDecoder = useCallback(() => {
    decoderRef.current = createDecoder();
    lastProgressRef.current = 0;
    stalledFramesRef.current = [];
    seenFramesRef.current = new Set();
  }, [createDecoder]);

  const reset = useCallback(() => {
    replaceDecoder();
    hasCompletedRef.current = false;
    setProgress(0);
    setIsComplete(false);
  }, [replaceDecoder]);

  const receiveFrame = useCallback(
    (frame: string) => {
      const feed = (part: string): void => {
        if (hasCompletedRef.current) {
          return;
        }
        // A part of another UR type can NEVER be accepted, so waiting for the
        // stall budget below waits for evidence that cannot arrive: repeats are
        // dropped, and a single-frame reply is read exactly once. Nothing to
        // replay — a mismatched frame takes this branch on arrival, so every
        // frame that reached the stalled list matched the type being replaced.
        if (decoderRef.current.canAccept?.(part) === false) {
          replaceDecoder();
          setProgress(0);
          feed(part);
          return;
        }
        if (seenFramesRef.current.has(part)) {
          return;
        }
        seenFramesRef.current.add(part);

        let received: UrReceiveResult;
        try {
          received = decoderRef.current.receivePart(part);
        } catch {
          // A frame that fails to parse throws before the fountain decoder is
          // touched, so accumulated multi-part progress survives and the frame
          // can simply be ignored. The one thing such a frame can poison is the
          // expected UR type a fresh decoder latches from it, so replace the
          // decoder only while there is no progress to lose.
          if (decoderRef.current.progress() === 0) {
            replaceDecoder();
          }
          return;
        }

        const failureMessage = decoderRef.current.failureMessage();
        if (failureMessage !== undefined) {
          hasCompletedRef.current = true;
          onError?.(failureMessage);
          return;
        }

        setProgress(received.progress);

        if (received.complete) {
          if (onComplete(decoderRef.current.result()) === false) {
            replaceDecoder();
            setProgress(0);
            return;
          }
          hasCompletedRef.current = true;
          setIsComplete(true);
          return;
        }

        if (received.progress > lastProgressRef.current) {
          lastProgressRef.current = received.progress;
          stalledFramesRef.current = [];
          return;
        }
        stalledFramesRef.current.push(part);
        const limit =
          lastProgressRef.current >= 0.99
            ? CAPPED_STALLED_FRAME_LIMIT
            : STALLED_FRAME_LIMIT;
        if (stalledFramesRef.current.length < limit) return;
        const replay = stalledFramesRef.current;
        replaceDecoder();
        setProgress(0);
        for (const stalled of replay) feed(stalled);
      };
      feed(frame);
    },
    [onComplete, onError, replaceDecoder],
  );

  return useMemo(
    () => ({ progress, isComplete, receiveFrame, reset }),
    [progress, isComplete, receiveFrame, reset],
  );
};
