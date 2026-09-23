import type { TranslationKey } from '@lace-contract/i18n';
import type { RealFiErrorCode } from '@lace-contract/realfi-staking';

export type ComplianceMessaging = {
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  /**
   * Whether retrying can plausibly succeed: a screening-service blip can
   * recover on retry; a refusal (or a review still in progress) cannot, and
   * re-trying only burns screening budget.
   */
  retryable: boolean;
};

/**
 * State-specific user messaging for a compliance-gate failure, mirroring
 * RealFi's own dApp: still-under-review, refused, and service-unreachable each
 * say something different, always confirm no funds have left the wallet, and
 * point at support@realfi.co. The body copy is deliberately generic about WHY
 * (tipping-off rules: never a score, category, or reason). Undefined for every
 * non-compliance failure — callers fall back to the raw-detail rendering.
 */
const MESSAGING: Partial<Record<RealFiErrorCode, ComplianceMessaging>> = {
  COMPLIANCE_PENDING_REVIEW: {
    titleKey: 'realfi.compliance.pending-review.title',
    bodyKey: 'realfi.compliance.pending-review.body',
    retryable: false,
  },
  COMPLIANCE_NOT_AUTHORIZED: {
    titleKey: 'realfi.compliance.not-authorized.title',
    bodyKey: 'realfi.compliance.not-authorized.body',
    retryable: false,
  },
  COMPLIANCE_UNAVAILABLE: {
    titleKey: 'realfi.compliance.unavailable.title',
    bodyKey: 'realfi.compliance.unavailable.body',
    retryable: true,
  },
};

export const complianceMessagingFor = (
  code: RealFiErrorCode | undefined,
): ComplianceMessaging | undefined =>
  code === undefined ? undefined : MESSAGING[code];
