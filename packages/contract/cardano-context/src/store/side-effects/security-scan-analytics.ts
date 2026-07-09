/**
 * Why a security scan ran (the incident being checked, not where it was
 * triggered). A single-member union today; extend it as new incidents ship.
 */
export type SecurityScanReason = 'secondFi202606';

type SecurityScanAnalyticsProps =
  | {
      reason: SecurityScanReason;
      status: 'completed';
      result: 'issues found' | 'no issues found';
      durationMs: number;
      requestCount: number;
    }
  | {
      reason: SecurityScanReason;
      status: 'failed';
      durationMs: number;
      requestCount: number;
    };

/**
 * Builds the payload for the "security scan" analytics event, enforcing the
 * mandatory `reason`/`result` shape the platform's generic
 * `Record<string, JsonType>` payload type cannot. `result` is present only for
 * completed scans; failed scans omit it and set `status: 'failed'`.
 */
export const buildSecurityScanEvent = (props: SecurityScanAnalyticsProps) =>
  ({ eventName: 'security scan', payload: props } as const);
