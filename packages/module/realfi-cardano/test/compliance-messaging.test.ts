import { describe, expect, it } from 'vitest';

import { complianceMessagingFor } from '../src/compliance-messaging';

describe('complianceMessagingFor', () => {
  it('maps each compliance code to its copy, with retry only for a service blip', () => {
    expect(complianceMessagingFor('COMPLIANCE_PENDING_REVIEW')).toEqual({
      titleKey: 'realfi.compliance.pending-review.title',
      bodyKey: 'realfi.compliance.pending-review.body',
      retryable: false,
    });
    expect(complianceMessagingFor('COMPLIANCE_NOT_AUTHORIZED')).toEqual({
      titleKey: 'realfi.compliance.not-authorized.title',
      bodyKey: 'realfi.compliance.not-authorized.body',
      retryable: false,
    });
    expect(complianceMessagingFor('COMPLIANCE_UNAVAILABLE')).toEqual({
      titleKey: 'realfi.compliance.unavailable.title',
      bodyKey: 'realfi.compliance.unavailable.body',
      retryable: true,
    });
  });

  it('returns undefined for non-compliance codes so callers fall back to raw detail', () => {
    expect(complianceMessagingFor('PROVIDER_UNAVAILABLE')).toBeUndefined();
    expect(complianceMessagingFor(undefined)).toBeUndefined();
  });
});
