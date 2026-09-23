// The scannability argument for the animated QR is arithmetic, so it is pinned
// here rather than left in a comment. The numbers come from a real UR part: a
// 215-character frame is 49 modules across at error-correction level M (57 at
// Q, which is why the camera path lowers it).
import { describe, expect, it } from 'vitest';

import { qrDrawMetrics } from '../src/design-system/atoms/qrCode/qrDrawMetrics';

/** A 215-char UR part at level M. */
const UR_FRAME_MODULES = 49;

describe('qrDrawMetrics', () => {
  it('reserves the four-module quiet zone ISO/IEC 18004 requires', () => {
    const { pieceSize, quietZone } = qrDrawMetrics({
      moduleCount: 10,
      side: 180,
    });

    // 10 modules + 4 either side = 18 module widths across 180px.
    expect(pieceSize).toBe(10);
    expect(quietZone).toBe(40);
  });

  it('more than doubles the module size the side panel used to give a camera', () => {
    // Before: the container was 50% of a 400px card (~176px) with a fixed 8px
    // pad, and the payload was 57 modules at level Q — about 2.8px per module.
    const before = (176 - 8 * 2) / 57;
    expect(before).toBeLessThan(3);

    // After: 96% of the same card, the quiet zone scaled with the modules, and
    // 49 modules at level M.
    const { pieceSize } = qrDrawMetrics({
      moduleCount: UR_FRAME_MODULES,
      side: 400 * 0.96,
    });

    expect(pieceSize).toBeGreaterThan(before * 2);
  });

  it('falls back rather than dividing by an unmeasured container', () => {
    // First paint, before `onLayout`. The caller draws nothing at all in this
    // state — see `QrCode` — so what matters is only that it cannot produce
    // Infinity or NaN and feed that to the renderer.
    expect(
      qrDrawMetrics({ moduleCount: 49, side: 0 }).pieceSize,
    ).toBeGreaterThan(0);
    expect(
      qrDrawMetrics({ moduleCount: 0, side: 300 }).pieceSize,
    ).toBeGreaterThan(0);
  });
});
