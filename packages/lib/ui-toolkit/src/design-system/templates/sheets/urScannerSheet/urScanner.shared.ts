import type { UrResult } from './useUrReassembly';
import type { Theme } from '../../../../design-tokens';

export type { UrResult } from './useUrReassembly';

/**
 * Props for the navigation-free {@link UrScanner}. Unlike UrScannerSheet, this
 * renders its own cancel button and does NOT call useNavigation, so it can be
 * mounted as a free-standing overlay (e.g. the seed-signer global overlay)
 * outside a React Navigation screen.
 */
export interface UrScannerProps {
  /**
   * Called once the animated-QR stream reassembles into a complete payload.
   * Return false to reject the payload (e.g. an unexpected UR type) and
   * resume scanning with a fresh decoder.
   */
  onComplete: (result: UrResult) => boolean | void;
  /** Called when the user cancels scanning. */
  onCancel: () => void;
  /** Called when reassembly fails irrecoverably. Optional. */
  onError?: (message: string) => void;
  theme: Theme;
}
