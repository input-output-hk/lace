/**
 * Diagnostic logger for the RealFi staking flow — dev builds only; a no-op in
 * production (LW-14681 tracks full removal). Emits a timestamped, single-line
 * JSON payload so a console capture can be shared verbatim with the RealFi
 * team. On the extension, the flow spans two consoles: side-effects/provider
 * code logs in the service-worker console, sheet components in the tab
 * console — capture both.
 *
 * BigInt and Error values are serialized (JSON.stringify would throw on the
 * former and emit `{}` for the latter); a payload that still fails to
 * stringify (e.g. circular) falls back to raw object logging rather than
 * throwing into the flow it instruments.
 */

// The tab UI (React Native / Metro) sets the `__DEV__` global — trust it
// exclusively there, since Metro prod builds don't reliably inline NODE_ENV.
// The SW (webpack) and vitest set NODE_ENV instead ('production' in release
// builds, so the gate is false there).
const isDevelopmentBuild = ((): boolean => {
  const isMetroDevelopment = (globalThis as { __DEV__?: boolean }).__DEV__;
  if (isMetroDevelopment !== undefined) return isMetroDevelopment;
  return (
    typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
  );
})();

export const realfiDebugLog = (
  step: string,
  data?: Record<string, unknown>,
): void => {
  if (!isDevelopmentBuild) return;
  const prefix = `[RealFi ${new Date().toISOString()}] ${step}`;
  try {
    const json =
      data === undefined
        ? ''
        : JSON.stringify(data, (_key, value: unknown) => {
            if (typeof value === 'bigint') return `${value}n`;
            if (value instanceof Error) {
              return {
                name: value.name,
                message: value.message,
                stack: value.stack,
              };
            }
            return value;
          });
    // eslint-disable-next-line no-console
    console.log(prefix, json);
  } catch {
    // eslint-disable-next-line no-console
    console.log(prefix, data);
  }
};
