import { describe, expect, it } from 'vitest';

import {
  DREP_ALWAYS_ABSTAIN,
  DREP_ALWAYS_NO_CONFIDENCE,
  isSentinelDrepId,
} from '../src/drep';

describe('isSentinelDrepId', () => {
  it('is true for the abstain sentinel', () => {
    expect(isSentinelDrepId(DREP_ALWAYS_ABSTAIN)).toBe(true);
  });

  it('is true for the no-confidence sentinel', () => {
    expect(isSentinelDrepId(DREP_ALWAYS_NO_CONFIDENCE)).toBe(true);
  });

  it('is false for a specific bech32 DRep id', () => {
    expect(isSentinelDrepId('drep1specific')).toBe(false);
  });
});
