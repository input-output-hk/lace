import { describe, expect, it } from 'vitest';

import { DREP_ALWAYS_ABSTAIN, isSentinelDrepId } from '../src/drep';

import account from './fixtures/preprod-abstain-account.blockfrost.json';

/**
 * Golden fixture: a real Blockfrost `/accounts/{stake}` response for an
 * abstain-vote-delegated preprod account (captured 2026-07-18). Our unit tests
 * mock Blockfrost with the assumed sentinel string. This pins that the string
 * Blockfrost actually returns for abstain equals our constant. If Blockfrost
 * ever changes the representation (e.g. a bech32 DRep id), this fails here
 * instead of silently letting `isSentinelDrepId` classify a placeholder as a real
 * DRep — which would let one be promoted as an earn-rewards target.
 */
describe('Blockfrost drep_id sentinel (golden)', () => {
  it('returns drep_always_abstain for an abstain-delegated account', () => {
    expect(account.drep_id).toBe(DREP_ALWAYS_ABSTAIN);
  });

  it('classifies the real drep_id as a sentinel', () => {
    // The provider passes account.drep_id through verbatim to
    // RewardAccountInfo.drepId, so this is the value callers classify.
    expect(isSentinelDrepId(account.drep_id)).toBe(true);
  });
});
