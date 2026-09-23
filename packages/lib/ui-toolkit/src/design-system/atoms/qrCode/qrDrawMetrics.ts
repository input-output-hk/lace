/**
 * How big one QR module is drawn, and how much quiet zone surrounds it.
 *
 * Its own module, with no react-native import, for two reasons: the whole
 * scannability argument for the animated QR is this arithmetic and it deserves
 * a test, and a test that reached through `qrCode.tsx` would pull in
 * react-native, whose Flow `import typeof` Rollup cannot parse.
 */

/** Used before the container has been measured; the caller draws nothing then. */
export const FALLBACK_PIECE_SIZE = 5;

/** Quiet zone ISO/IEC 18004 requires, in modules. */
export const QUIET_ZONE_MODULES = 4;

/**
 * The module side and quiet zone for a QR of `moduleCount` drawn inside `side`
 * pixels, reserving the spec's quiet zone out of that same box.
 */
export const qrDrawMetrics = ({
  moduleCount,
  side,
}: {
  moduleCount: number;
  side: number;
}): { pieceSize: number; quietZone: number } => {
  if (moduleCount <= 0 || side <= 0) {
    return { pieceSize: FALLBACK_PIECE_SIZE, quietZone: 0 };
  }
  const pieceSize = side / (moduleCount + QUIET_ZONE_MODULES * 2);
  return { pieceSize, quietZone: pieceSize * QUIET_ZONE_MODULES };
};
