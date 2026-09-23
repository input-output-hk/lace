// The presentation-free half of a sandboxed guest's hardware-wallet pairing
// entry (ADR 44): WHICH devices and blockchains the host can pair, and WHETHER
// its pairing window is still open. The picker itself belongs to the guest that
// renders it — React Native in apps/lace-extension-guest, DOM in the carbon
// guest (ADR 53/40) — and both reach the host over the same `window.lace`
// surface, so nothing here may import a presentation package.
export {
  HARDWARE_ONBOARDING_OPTIONS,
  hwPairingChoiceOf,
  hwPairingChoicesFor,
  isHwDevice,
  SUPPORTED_DEVICES,
} from './devices';
export { probePairingWindow, watchPairingWindow } from './pairing-liveness';
