import { Cardano } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import {
  DREP_ALWAYS_ABSTAIN,
  DREP_ALWAYS_NO_CONFIDENCE,
  getDelegationHealth,
  getDelegationStatus,
  isSentinelDrepId,
  parseGovernanceFeatureFlagPayload,
  pickPromotedInformation,
  promotedNetworkKeyForChainId,
} from '../src/const';

import type { DRepSummary } from '@lace-contract/cardano-context';

describe('governance-center delegation status helpers', () => {
  describe('isSentinelDrepId', () => {
    it('is true for the abstain sentinel', () => {
      expect(isSentinelDrepId(DREP_ALWAYS_ABSTAIN)).toBe(true);
    });

    it('is true for the no-confidence sentinel', () => {
      expect(isSentinelDrepId(DREP_ALWAYS_NO_CONFIDENCE)).toBe(true);
    });

    it('is false for a specific DRep id', () => {
      expect(isSentinelDrepId('drep1specific')).toBe(false);
    });
  });

  describe('getDelegationStatus', () => {
    it('is "not-delegated" when drepId is undefined', () => {
      expect(getDelegationStatus(undefined)).toBe('not-delegated');
    });

    it('is "abstaining" for the abstain sentinel', () => {
      expect(getDelegationStatus(DREP_ALWAYS_ABSTAIN)).toBe('abstaining');
    });

    it('is "no-confidence" for the no-confidence sentinel', () => {
      expect(getDelegationStatus(DREP_ALWAYS_NO_CONFIDENCE)).toBe(
        'no-confidence',
      );
    });

    it('is "delegated" for a specific DRep id', () => {
      expect(getDelegationStatus('drep1specific')).toBe('delegated');
    });
  });
});

describe('parseGovernanceFeatureFlagPayload', () => {
  it('returns the promotedDreps map from a valid payload', () => {
    const promotedDreps = { mainnet: [{ id: 'drep1abc' }] };
    expect(
      parseGovernanceFeatureFlagPayload({ payload: { promotedDreps } }),
    ).toEqual({ promotedDreps });
  });

  it('returns {} when the flag is missing', () => {
    expect(parseGovernanceFeatureFlagPayload(undefined)).toEqual({});
  });

  it('returns {} when the payload is absent or not an object', () => {
    expect(parseGovernanceFeatureFlagPayload({})).toEqual({});
    expect(parseGovernanceFeatureFlagPayload({ payload: 'nope' })).toEqual({});
  });

  it('returns {} when promotedDreps is missing or malformed', () => {
    expect(parseGovernanceFeatureFlagPayload({ payload: {} })).toEqual({});
    expect(
      parseGovernanceFeatureFlagPayload({ payload: { promotedDreps: 1 } }),
    ).toEqual({});
  });
});

describe('promotedNetworkKeyForChainId', () => {
  it('maps each known Cardano network', () => {
    expect(promotedNetworkKeyForChainId(Cardano.ChainIds.Mainnet)).toBe(
      'mainnet',
    );
    expect(promotedNetworkKeyForChainId(Cardano.ChainIds.Preprod)).toBe(
      'preprod',
    );
    expect(promotedNetworkKeyForChainId(Cardano.ChainIds.Preview)).toBe(
      'preview',
    );
    expect(promotedNetworkKeyForChainId(Cardano.ChainIds.Sanchonet)).toBe(
      'sanchonet',
    );
  });

  it('returns undefined for an unknown network magic', () => {
    expect(
      promotedNetworkKeyForChainId({
        networkId: 0,
        networkMagic: 999999,
      } as Cardano.ChainId),
    ).toBeUndefined();
  });
});

describe('pickPromotedInformation', () => {
  const info = { en: 'English', es: 'Spanish', ja: 'Japanese' };

  it('returns undefined when no information provided', () => {
    expect(pickPromotedInformation(undefined, 'en')).toBeUndefined();
  });

  it('returns the exact language match', () => {
    expect(pickPromotedInformation(info, 'es')).toBe('Spanish');
  });

  it('falls back to the 2-letter prefix', () => {
    expect(pickPromotedInformation(info, 'ja-JP')).toBe('Japanese');
  });

  it('falls back to English when the language is missing', () => {
    expect(pickPromotedInformation(info, 'fr')).toBe('English');
  });

  it('falls back to the first available when English is missing', () => {
    expect(pickPromotedInformation({ es: 'Spanish' }, 'fr')).toBe('Spanish');
  });
});

describe('getDelegationHealth', () => {
  const makeDRep = (overrides: Partial<DRepSummary> = {}): DRepSummary =>
    ({
      drepId: 'drep1aaa',
      cip105DrepId: 'drep1cip105',
      hex: '22aa',
      isActive: true,
      retired: false,
      expired: false,
      amount: '1',
      hasScript: false,
      ...overrides,
    } as DRepSummary);

  const dReps = [makeDRep()];

  it('returns not-delegated when drepId is undefined', () => {
    expect(
      getDelegationHealth({ drepId: undefined, dReps, listReady: true }),
    ).toBe('not-delegated');
  });

  it('returns delegated for sentinel drep ids regardless of the list', () => {
    expect(
      getDelegationHealth({
        drepId: 'drep_always_abstain',
        dReps: [],
        listReady: false,
      }),
    ).toBe('delegated');
    expect(
      getDelegationHealth({
        drepId: 'drep_always_no_confidence',
        dReps: [],
        listReady: false,
      }),
    ).toBe('delegated');
  });

  it('returns unknown for a specific drep before the list is ready', () => {
    expect(
      getDelegationHealth({ drepId: 'drep1aaa', dReps: [], listReady: false }),
    ).toBe('unknown');
  });

  it('returns delegated for an active listed drep', () => {
    expect(
      getDelegationHealth({ drepId: 'drep1aaa', dReps, listReady: true }),
    ).toBe('delegated');
  });

  it('returns drep-problem when the drep is retired', () => {
    expect(
      getDelegationHealth({
        drepId: 'drep1aaa',
        dReps: [makeDRep({ retired: true, isActive: false })],
        listReady: true,
      }),
    ).toBe('drep-problem');
  });

  it('returns drep-problem when the drep is expired', () => {
    expect(
      getDelegationHealth({
        drepId: 'drep1aaa',
        dReps: [makeDRep({ expired: true, isActive: false })],
        listReady: true,
      }),
    ).toBe('drep-problem');
  });

  it('returns drep-problem when the drep is absent from the ready list', () => {
    expect(
      getDelegationHealth({ drepId: 'drep1zzz', dReps, listReady: true }),
    ).toBe('drep-problem');
  });
});
