import { beforeEach, describe, expect, it } from 'vitest';

import {
  analyticsActions as actions,
  analyticsSelectors as selectors,
} from '../../src';
import { ANALYTICS_CONSENT_FEATURE_FLAG } from '../../src/const';
import { analyticsReducers } from '../../src/store/slice';

import type { AnalyticsSliceState } from '../../src';
import type { FeatureFlagKey } from '@lace-contract/feature';

const featuresWith = (flagKeys: FeatureFlagKey[]) => ({
  loaded: { modules: [], featureFlags: flagKeys.map(key => ({ key })) },
});

const featuresEmpty = featuresWith([]);
const featuresWithFlag = featuresWith([ANALYTICS_CONSENT_FEATURE_FLAG]);

const stateFor = (
  analytics: AnalyticsSliceState['analytics'],
  features = featuresEmpty,
) => ({ analytics: { analytics } as AnalyticsSliceState, features });

describe('analytics slice', () => {
  let initialState: AnalyticsSliceState;

  beforeEach(() => {
    initialState = analyticsReducers.analytics(undefined, {
      type: 'doesnt-matter',
    });
  });

  describe('reducers', () => {
    describe('load', () => {
      it('should load user details into the state', () => {
        const userPayload = {
          id: 'user1',
        };

        const updatedState = analyticsReducers.analytics(
          initialState,
          actions.analytics.load(userPayload),
        );

        expect(updatedState.analytics.user).toEqual(userPayload);
      });
    });

    describe('grantConsent', () => {
      it('should record the opt-in', () => {
        const updatedState = analyticsReducers.analytics(
          initialState,
          actions.analytics.grantConsent(),
        );

        expect(updatedState.analytics.consent).toBe('granted');
      });

      it('should leave an already minted user id alone', () => {
        const withUser = analyticsReducers.analytics(
          initialState,
          actions.analytics.load({ id: 'user1' }),
        );

        const updatedState = analyticsReducers.analytics(
          withUser,
          actions.analytics.grantConsent(),
        );

        expect(updatedState.analytics.user).toEqual({ id: 'user1' });
      });
    });

    describe('revokeConsent', () => {
      it('should record the opt-out', () => {
        const updatedState = analyticsReducers.analytics(
          initialState,
          actions.analytics.revokeConsent(),
        );

        expect(updatedState.analytics.consent).toBe('denied');
      });

      it('should discard the user id so a later opt-in cannot be joined to it', () => {
        const granted = analyticsReducers.analytics(
          analyticsReducers.analytics(
            initialState,
            actions.analytics.grantConsent(),
          ),
          actions.analytics.load({ id: 'user1' }),
        );

        const updatedState = analyticsReducers.analytics(
          granted,
          actions.analytics.revokeConsent(),
        );

        expect(updatedState.analytics.user).toBeUndefined();
      });
    });

    describe('discardUser', () => {
      it('should drop the id without answering the consent question', () => {
        const loaded = analyticsReducers.analytics(
          undefined,
          actions.analytics.load({ id: 'user1' }),
        );

        const updatedState = analyticsReducers.analytics(
          loaded,
          actions.analytics.discardUser(),
        );

        expect(updatedState.analytics.user).toBeUndefined();
        expect(updatedState.analytics.consent).toBeUndefined();
      });
    });
  });

  describe('selectors', () => {
    describe('selectAnalyticsUser', () => {
      it('should return the loaded user', () => {
        expect(
          selectors.analytics.selectAnalyticsUser(
            stateFor({ user: { id: 'user1' } }),
          ),
        ).toEqual({ id: 'user1' });
      });

      it('should return undefined before an id is minted', () => {
        expect(
          selectors.analytics.selectAnalyticsUser(stateFor({})),
        ).toBeUndefined();
      });
    });

    describe('selectAnalyticsConsent', () => {
      it.each(['granted', 'denied'] as const)('should return %s', consent => {
        expect(
          selectors.analytics.selectAnalyticsConsent(stateFor({ consent })),
        ).toBe(consent);
      });

      it('should return undefined when the user has not been asked', () => {
        expect(
          selectors.analytics.selectAnalyticsConsent(stateFor({})),
        ).toBeUndefined();
      });
    });

    describe('selectIsAnalyticsPermitted', () => {
      describe('when ANALYTICS_CONSENT_REQUIRED is absent', () => {
        it.each([undefined, 'granted', 'denied'] as const)(
          'returns true for consent %s',
          consent => {
            expect(
              selectors.analytics.selectIsAnalyticsPermitted(
                stateFor({ consent }, featuresEmpty),
              ),
            ).toBe(true);
          },
        );
      });

      describe('when ANALYTICS_CONSENT_REQUIRED is present', () => {
        it('returns true only once consent is granted', () => {
          expect(
            selectors.analytics.selectIsAnalyticsPermitted(
              stateFor({ consent: 'granted' }, featuresWithFlag),
            ),
          ).toBe(true);
        });

        it.each([undefined, 'denied'] as const)(
          'returns false for consent %s',
          consent => {
            expect(
              selectors.analytics.selectIsAnalyticsPermitted(
                stateFor({ consent }, featuresWithFlag),
              ),
            ).toBe(false);
          },
        );
      });
    });
  });
});
