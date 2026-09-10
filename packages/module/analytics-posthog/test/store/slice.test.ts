import { describe, expect, it } from 'vitest';

import {
  posthogAnalyticsActions,
  posthogAnalyticsReducers,
  posthogAnalyticsSelectors,
} from '../../src/store/slice';

import type { IdentifiedUser } from '../../src/store/slice';

const reducer = posthogAnalyticsReducers.posthogAnalytics;
const initialState = reducer(undefined, { type: 'doesnt-matter' });

describe('posthogAnalytics slice', () => {
  const identifiedUser: IdentifiedUser = {
    userId: 'user-1',
    properties: { num_wallets: 1 },
  };

  describe('reducers', () => {
    describe('identified', () => {
      it('stores the identified user snapshot', () => {
        const updatedState = reducer(
          initialState,
          posthogAnalyticsActions.posthogAnalytics.identified(identifiedUser),
        );

        expect(updatedState.identifiedUser).toEqual(identifiedUser);
      });

      it('merges into the existing snapshot for the same user, keeping a key the payload omits', () => {
        const withGovernance = reducer(
          initialState,
          posthogAnalyticsActions.posthogAnalytics.identified({
            userId: 'user-1',
            properties: { num_wallets: 1, cardano_governance_accounts: [] },
          }),
        );

        const updatedState = reducer(
          withGovernance,
          posthogAnalyticsActions.posthogAnalytics.identified({
            // No governance key: identify merges, so the remote value survives
            // and this mirror of it has to survive too — otherwise the next
            // identify reads as a change and gets re-sent.
            userId: 'user-1',
            properties: { num_wallets: 2 },
          }),
        );

        expect(updatedState.identifiedUser).toEqual({
          userId: 'user-1',
          properties: { num_wallets: 2, cardano_governance_accounts: [] },
        });
      });

      it('replaces the snapshot when the user id changes', () => {
        const previous = reducer(
          initialState,
          posthogAnalyticsActions.posthogAnalytics.identified({
            userId: 'user-1',
            properties: { num_wallets: 1, cardano_governance_accounts: [] },
          }),
        );

        const updatedState = reducer(
          previous,
          posthogAnalyticsActions.posthogAnalytics.identified({
            userId: 'user-2',
            properties: { num_wallets: 2 },
          }),
        );

        expect(updatedState.identifiedUser).toEqual({
          userId: 'user-2',
          properties: { num_wallets: 2 },
        });
      });
    });
  });

  describe('selectors', () => {
    describe('selectIdentifiedUser', () => {
      it('returns null before any identify has been persisted', () => {
        expect(
          posthogAnalyticsSelectors.posthogAnalytics.selectIdentifiedUser({
            posthogAnalytics: initialState,
          }),
        ).toBeNull();
      });

      it('returns the persisted identified user snapshot', () => {
        expect(
          posthogAnalyticsSelectors.posthogAnalytics.selectIdentifiedUser({
            posthogAnalytics: reducer(
              initialState,
              posthogAnalyticsActions.posthogAnalytics.identified(
                identifiedUser,
              ),
            ),
          }),
        ).toEqual(identifiedUser);
      });
    });
  });
});
