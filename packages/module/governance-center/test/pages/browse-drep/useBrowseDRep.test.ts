/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as hooksModule from '../../../src/hooks';
import { useBrowseDRep } from '../../../src/pages/browse-drep/useBrowseDRep';

import type { DRepSummary } from '@lace-contract/cardano-context';

// mockDispatch records every dispatch routed through useDispatchLaceAction
// with the action key as the first argument.
const mockDispatch = vi.fn();

vi.mock('../../../src/hooks', () => ({
  useLaceSelector: vi.fn(),
  useDispatchLaceAction: vi.fn((key: string) => (argument?: unknown) => {
    mockDispatch(key, argument);
  }),
}));

vi.mock('@lace-contract/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('@lace-contract/analytics', () => ({
  useAnalytics: () => ({ trackEvent: vi.fn() }),
}));

// The real package entry point loads the whole contract chain at import time;
// the hook only needs the language picker, so a behavioral stub of its
// exact-match case keeps the test import graph flat.
vi.mock('@lace-contract/governance-center', () => ({
  pickPromotedInformation: (
    information: Record<string, string> | undefined,
    language: string,
  ) => information?.[language],
}));

vi.mock('@lace-lib/navigation', () => ({
  NavigationControls: { navigate: vi.fn() },
  SheetRoutes: {
    DRepDetails: 'DRepDetails',
    NewDRepDelegation: 'NewDRepDelegation',
  },
}));

const ACCOUNT_ID = 'account-1';

const buildDRep = (
  overrides: Partial<DRepSummary> & Pick<DRepSummary, 'drepId'>,
): DRepSummary =>
  ({
    cip105DrepId: `${overrides.drepId}-cip105`,
    hex: 'ffff',
    isActive: true,
    retired: false,
    expired: false,
    amount: '0',
    hasScript: false,
    ...overrides,
  } as DRepSummary);

const FULL_PROFILE: DRepSummary['metadata'] = {
  imageUrl: 'ipfs://image',
  bio: 'bio',
  email: 'drep@example.org',
  objectives: 'objectives',
  motivations: 'motivations',
  qualifications: 'qualifications',
  paymentAddress: 'addr_full',
  references: [{ label: 'site', uri: 'https://example.org' }],
};

// Amounts sum to 19,800, so the share cap (1% of the directory total) is 198.
const whale = buildDRep({
  drepId: 'drep1whale',
  name: 'Whale',
  amount: '9000',
  hex: 'cccc',
} as never);
const fullProfile = buildDRep({
  drepId: 'drep1full-profile',
  name: 'Full Profile',
  amount: '600',
  metadata: FULL_PROFILE,
  hex: 'dddd',
} as never);
const solo = buildDRep({
  drepId: 'drep1solo',
  name: 'Solo',
  amount: '150',
  hex: 'eeee',
} as never);
// Two DReps sharing a payment address: one operator wearing two ids.
const cloneB = buildDRep({
  drepId: 'drep1clone-b',
  name: 'Clone B',
  amount: '400',
  metadata: { paymentAddress: 'addr_clone' },
  hex: 'bbbb',
} as never);
const cloneA = buildDRep({
  drepId: 'drep1clone-a',
  name: 'Clone A',
  amount: '400',
  metadata: { paymentAddress: 'addr_clone' },
  hex: 'aaaa',
} as never);
const small = buildDRep({
  drepId: 'drep1small',
  name: 'Small',
  amount: '50',
  hex: '9999',
} as never);
const bareWhale = buildDRep({
  drepId: 'drep1bare-whale',
  amount: '9000',
  hex: '8888',
} as never);
const lapsed = buildDRep({
  drepId: 'drep1lapsed',
  name: 'Lapsed',
  isActive: false,
  expired: true,
  amount: '100',
  hex: '7777',
} as never);
const retired = buildDRep({
  drepId: 'drep1retired',
  name: 'Retired',
  isActive: false,
  retired: true,
  expired: true,
  amount: '100',
  hex: '6666',
} as never);

// cloneB deliberately precedes cloneA so a feed-order-dependent tie-break
// would show.
const DIRECTORY = [
  whale,
  cloneB,
  fullProfile,
  solo,
  cloneA,
  small,
  bareWhale,
  lapsed,
  retired,
];

type SelectorState = Record<string, unknown>;

const defaultSelectorState = (): SelectorState => ({
  'dRepsList.selectDReps': DIRECTORY,
  'dRepsList.selectDRepsIsInitiallyLoading': false,
  'dRepsList.selectDRepsHasError': false,
  'dRepsFilter.selectDRepStatus': 'all',
  'dRepsFilter.selectDRepSortBy': null,
  'promotedDReps.selectActivePromoted': [],
  'promotedDReps.selectActiveBlocked': [],
});

const mockUseLaceSelector = vi.mocked(hooksModule.useLaceSelector);

const renderBrowseDRep = (
  overrides: SelectorState = {},
  accountId: string = ACCOUNT_ID,
) => {
  const state = { ...defaultSelectorState(), ...overrides };
  mockUseLaceSelector.mockImplementation((key: string) => state[key] as never);
  return renderHook(() => useBrowseDRep(accountId));
};

const listedIds = (result: {
  current: { listItems: { kind: string; summary?: DRepSummary }[] };
}): string[] =>
  result.current.listItems
    .filter(item => item.kind === 'drep')
    .map(item => String(item.summary?.drepId));

describe('useBrowseDRep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('landing rank (no explicit sort chosen)', () => {
    it('orders by the full rank: cap, clusters, tier, then per-account rotation', () => {
      const { result } = renderBrowseDRep();
      expect(listedIds(result)).toEqual([
        // Whale and Full Profile both hit the 1% cap (198): the completeness
        // tier decides, so 15x less stake with a full profile outranks the
        // whale (9 fields = tier 2; name-only = tier 0).
        'drep1full-profile',
        'drep1whale',
        // Solo's uncapped 150 beats the clones' 400-capped-to-198 halved (99).
        'drep1solo',
        // Clones tie on power and tier: the per-account rotation key decides.
        'drep1clone-b',
        'drep1clone-a',
        'drep1small',
        // Active but no resolvable name: below every identifiable active row
        // despite holding the joint-largest stake.
        'drep1bare-whale',
        // Not active: below every active row; equal rank inputs, rotation
        // decides.
        'drep1retired',
        'drep1lapsed',
      ]);
    });

    it('rotates equal-rank rows differently per account, stably per account', () => {
      // small(50) is below the 92 cap; whale and solo are both capped to 92,
      // name-only tier: only the account-scoped rotation key separates them.
      const trio = [small, solo, whale];
      const { result: first } = renderBrowseDRep({
        'dRepsList.selectDReps': trio,
      });
      const { result: again } = renderBrowseDRep({
        'dRepsList.selectDReps': trio,
      });
      const { result: other } = renderBrowseDRep(
        { 'dRepsList.selectDReps': trio },
        'account-2',
      );
      expect(listedIds(first)).toEqual([
        'drep1whale',
        'drep1solo',
        'drep1small',
      ]);
      expect(listedIds(again)).toEqual(listedIds(first));
      expect(listedIds(other)).toEqual([
        'drep1solo',
        'drep1whale',
        'drep1small',
      ]);
    });

    it('grants the top tier on substance (rendered profile + reference), not schema width', () => {
      // A lean spec-faithful profile — the narrative trio plus one reference,
      // no cosmetic or non-CIP-119 fields — ties with the 9-field profile:
      // rotation, not field count, decides between them.
      const leanProfile = buildDRep({
        drepId: 'drep1solo',
        name: 'Lean Profile',
        amount: '600',
        metadata: {
          objectives: 'objectives',
          motivations: 'motivations',
          qualifications: 'qualifications',
          references: [{ label: 'site', uri: 'https://example.org' }],
        },
        hex: 'eeee',
      } as never);
      const { result } = renderBrowseDRep({
        'dRepsList.selectDReps': [fullProfile, leanProfile],
      });
      expect(listedIds(result)).toEqual(['drep1solo', 'drep1full-profile']);
    });

    it('keeps a profile without a reference out of the top tier, whatever else it publishes', () => {
      // Trio + every cosmetic/non-CIP-119 field, but no reference: one tier
      // below the full profile, so it ranks after it despite equal power.
      const noReference = buildDRep({
        drepId: 'drep1solo',
        name: 'No Reference',
        amount: '600',
        metadata: {
          imageUrl: 'ipfs://image',
          bio: 'bio',
          email: 'drep@example.org',
          objectives: 'objectives',
          motivations: 'motivations',
          qualifications: 'qualifications',
        },
        hex: 'eeee',
      } as never);
      const { result } = renderBrowseDRep({
        'dRepsList.selectDReps': [noReference, fullProfile],
      });
      expect(listedIds(result)).toEqual(['drep1full-profile', 'drep1solo']);
    });

    it('ranks a bare-ID row above none of the identifiable actives, whatever its stake', () => {
      const { result } = renderBrowseDRep();
      const ids = listedIds(result);
      const bareIndex = ids.indexOf('drep1bare-whale');
      for (const id of [
        'drep1full-profile',
        'drep1whale',
        'drep1solo',
        'drep1clone-a',
        'drep1clone-b',
        'drep1small',
      ]) {
        expect(ids.indexOf(id)).toBeLessThan(bareIndex);
      }
    });

    it('treats a whitespace-only name as a bare-ID row', () => {
      const blankName = buildDRep({
        drepId: 'drep1blank',
        name: '   ',
        amount: '9999',
        hex: '5555',
      } as never);
      const { result } = renderBrowseDRep({
        'dRepsList.selectDReps': [blankName, small],
      });
      expect(listedIds(result)).toEqual(['drep1small', 'drep1blank']);
    });

    it('hides a config-blocked DRep from every order, filter, and partial search', () => {
      const blocked = { 'promotedDReps.selectActiveBlocked': ['drep1whale'] };
      expect(listedIds(renderBrowseDRep(blocked).result)).not.toContain(
        'drep1whale',
      );
      expect(
        listedIds(
          renderBrowseDRep({
            ...blocked,
            'dRepsFilter.selectDRepSortBy': 'votingPower',
          }).result,
        ),
      ).not.toContain('drep1whale');
      const { result: nameSearch } = renderBrowseDRep(blocked);
      act(() => {
        nameSearch.current.onSearchChange('Whale');
      });
      expect(listedIds(nameSearch)).not.toContain('drep1whale');
      const { result: partialIdSearch } = renderBrowseDRep(blocked);
      act(() => {
        partialIdSearch.current.onSearchChange('drep1wha');
      });
      expect(listedIds(partialIdSearch)).not.toContain('drep1whale');
    });

    it('reveals a blocked DRep only on the exact pasted DRep id, either encoding', () => {
      const blocked = { 'promotedDReps.selectActiveBlocked': ['drep1whale'] };
      const { result: exactId } = renderBrowseDRep(blocked);
      act(() => {
        exactId.current.onSearchChange('  DREP1WHALE ');
      });
      expect(listedIds(exactId)).toEqual(['drep1whale']);
      const { result: legacyId } = renderBrowseDRep(blocked);
      act(() => {
        legacyId.current.onSearchChange('drep1whale-cip105');
      });
      expect(listedIds(legacyId)).toEqual(['drep1whale']);
    });

    it('sizes payment-address clusters over active rows only', () => {
      // A lapsed row pointing at the victim's payment address must not divide
      // the victim's credit: total 9130 -> cap 91, so the victim holds 91
      // above mid's uncapped 80; counted, it would halve to 45 and rank below.
      const victim = buildDRep({
        drepId: 'drep1victim',
        name: 'Victim',
        amount: '9000',
        metadata: { paymentAddress: 'addr_victim' },
        hex: '4444',
      } as never);
      const mid = buildDRep({
        drepId: 'drep1mid',
        name: 'Mid',
        amount: '80',
        hex: '3333',
      } as never);
      const puppet = buildDRep({
        drepId: 'drep1puppet',
        name: 'Puppet',
        isActive: false,
        expired: true,
        amount: '50',
        metadata: { paymentAddress: 'addr_victim' },
        hex: '2222',
      } as never);
      const { result } = renderBrowseDRep({
        'dRepsList.selectDReps': [mid, victim, puppet],
      });
      expect(listedIds(result)).toEqual([
        'drep1victim',
        'drep1mid',
        'drep1puppet',
      ]);
    });

    it('still ranks the long tail below the cap by voting power', () => {
      const { result } = renderBrowseDRep({
        'dRepsList.selectDReps': [small, solo, whale],
      });
      // New total 9200 -> cap 92: whale capped; solo (150) capped too; small
      // (50) below cap stays ranked by its own power. The capped pair falls to
      // this account's rotation key.
      expect(listedIds(result)).toEqual([
        'drep1whale',
        'drep1solo',
        'drep1small',
      ]);
    });
  });

  describe('explicit sorts stay raw', () => {
    it('votingPower applies the raw descending order with no rank inputs', () => {
      const { result } = renderBrowseDRep({
        'dRepsFilter.selectDRepSortBy': 'votingPower',
      });
      // Joint-largest stakes lead regardless of identifiability; ties keep
      // feed order (whale precedes bareWhale in the directory).
      expect(listedIds(result).slice(0, 3)).toEqual([
        'drep1whale',
        'drep1bare-whale',
        'drep1full-profile',
      ]);
    });

    it('votingPower compares as bigint beyond Number precision', () => {
      // The two amounts differ by 1 lovelace above 2^53; a Number()-based
      // comparison collapses them to equal and keeps insertion order.
      const lower = buildDRep({
        drepId: 'drep1big-lower',
        name: 'Big Lower',
        amount: '9007199254740992',
      } as never);
      const higher = buildDRep({
        drepId: 'drep1big-higher',
        name: 'Big Higher',
        amount: '9007199254740993',
      } as never);
      const { result } = renderBrowseDRep({
        'dRepsList.selectDReps': [lower, higher],
        'dRepsFilter.selectDRepSortBy': 'votingPower',
      });
      expect(listedIds(result)).toEqual(['drep1big-higher', 'drep1big-lower']);
    });

    it('status ranks active DReps first and nothing else', () => {
      const { result } = renderBrowseDRep({
        'dRepsList.selectDReps': [lapsed, whale, small],
        'dRepsFilter.selectDRepSortBy': 'status',
      });
      expect(listedIds(result)).toEqual([
        'drep1whale',
        'drep1small',
        'drep1lapsed',
      ]);
    });
  });

  describe('filter state', () => {
    it('reports no active filters on the landing defaults', () => {
      const { result } = renderBrowseDRep();
      expect(result.current.hasActiveFilters).toBe(false);
    });

    it('reports active filters once an explicit sort is chosen', () => {
      const { result } = renderBrowseDRep({
        'dRepsFilter.selectDRepSortBy': 'votingPower',
      });
      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('dispatches the chosen sort', () => {
      const { result } = renderBrowseDRep();
      result.current.setSortBy('votingPower');
      expect(mockDispatch).toHaveBeenCalledWith('dRepsFilter.setDRepSortBy', {
        sortBy: 'votingPower',
      });
    });
  });
});
