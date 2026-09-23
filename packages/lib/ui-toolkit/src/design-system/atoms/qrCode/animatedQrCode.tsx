import React, { useEffect, useMemo, useState } from 'react';

import { QrCode } from './qrCode';

const DEFAULT_FPS = 8;

const MILLISECONDS_PER_SECOND = 1000;

type AnimatedQrCodeProps = Omit<React.ComponentProps<typeof QrCode>, 'data'> & {
  /** Ordered QR frame strings rendered one at a time. */
  frames: string[];
  /** Frames advanced per second. Ignored when fewer than two frames. Defaults to 8. */
  fps?: number;
};

/**
 * Renders an animated multi-frame QR code by cycling `frames` on an interval,
 * reusing the single-frame QrCode for rendering. Renders nothing when `frames`
 * is empty and skips the timer for a single frame.
 */
export const AnimatedQrCode = ({
  frames,
  fps = DEFAULT_FPS,
  ...qrCodeProps
}: AnimatedQrCodeProps) => {
  const [index, setIndex] = useState(0);

  const frameCount = frames.length;

  const intervalMs = useMemo(
    () => MILLISECONDS_PER_SECOND / Math.max(1, fps),
    [fps],
  );

  useEffect(() => {
    setIndex(0);

    if (frameCount < 2) {
      return;
    }

    const timer = setInterval(() => {
      setIndex(current => (current + 1) % frameCount);
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [frames, frameCount, intervalMs]);

  if (frameCount === 0) {
    return null;
  }

  // Every animated consumer in both stacks is a hardware wallet's camera, so
  // the machine-readable rendering is the default here rather than a per-caller
  // opt-in. Spread last so a caller can still say otherwise.
  return (
    <QrCode
      optimiseForDeviceCamera
      data={frames[index % frameCount]}
      {...qrCodeProps}
    />
  );
};
