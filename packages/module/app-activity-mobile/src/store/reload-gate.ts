// Webpack-based bundlers (Storybook's preview) don't follow Metro's `.ios.ts` /
// `.android.ts` resolution. Re-export the Android impl so non-Metro builds find a
// runnable module. Metro overrides this file via platform-suffix priority on
// `lace-mobile` builds, picking `reload-gate.ios.ts` on iOS and
// `reload-gate.android.ts` on Android directly. The Android impl is the
// non-iOS-specific gate (no worklets UAF on the platforms that fall through to
// this shim — Android, Storybook web), so it's the safer default.
export { reloadGate$ } from './reload-gate.android';
