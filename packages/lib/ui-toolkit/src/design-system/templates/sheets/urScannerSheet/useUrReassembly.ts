import { createUrDecoder } from '@lace-lib/ur-transport';
import { useCallback, useMemo, useRef, useState } from 'react';

import type { UrReceiveResult, UrResult } from '@lace-lib/ur-transport';

/** Re-export so consumers do not need a direct transport-lib import. */
export type { UrResult } from '@lace-lib/ur-transport';

export interface UseUrReassemblyProps {
  /**
   * Called once the animated-QR stream reassembles into a complete payload.
   * Return false to reject the payload (e.g. an unexpected UR type); the
   * decoder is replaced and scanning resumes.
   */
  onComplete: (result: UrResult) => boolean | void;
  /** Called when reassembly fails irrecoverably. */
  onError?: (message: string) => void;
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
export const useUrReassembly = ({
  onComplete,
  onError,
}: UseUrReassemblyProps): UseUrReassembly => {
  const decoderRef = useRef(createUrDecoder());
  const hasCompletedRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const reset = useCallback(() => {
    decoderRef.current = createUrDecoder();
    hasCompletedRef.current = false;
    setProgress(0);
    setIsComplete(false);
  }, []);

  const receiveFrame = useCallback(
    (frame: string) => {
      if (hasCompletedRef.current) {
        return;
      }

      let received: UrReceiveResult;
      try {
        received = decoderRef.current.receivePart(frame);
      } catch {
        // A frame that fails to parse throws before the fountain decoder is
        // touched, so accumulated multi-part progress survives and the frame
        // can simply be ignored. The one thing such a frame can poison is the
        // expected UR type a fresh decoder latches from it, so replace the
        // decoder only while there is no progress to lose.
        if (decoderRef.current.progress() === 0) {
          decoderRef.current = createUrDecoder();
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
          decoderRef.current = createUrDecoder();
          setProgress(0);
          return;
        }
        hasCompletedRef.current = true;
        setIsComplete(true);
      }
    },
    [onComplete, onError],
  );

  return useMemo(
    () => ({ progress, isComplete, receiveFrame, reset }),
    [progress, isComplete, receiveFrame, reset],
  );
};
