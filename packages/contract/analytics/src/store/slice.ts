import { featuresSelectors } from '@lace-contract/feature';
import { createAction, createSelector, createSlice } from '@reduxjs/toolkit';

import { ANALYTICS_CONSENT_FEATURE_FLAG } from '../const';

import type { AnalyticsEvent } from '../types';
import type {
  PayloadAction,
  StateFromReducersMapObject,
} from '@reduxjs/toolkit';

export type AnalyticsUser = {
  id: string;
};

/** `undefined` is "not asked yet", which is neither an opt-in nor an opt-out. */
export type AnalyticsConsent = 'denied' | 'granted';

export type AnalyticsSliceState = {
  analytics: {
    user?: AnalyticsUser;
    consent?: AnalyticsConsent;
  };
};

const initialState: AnalyticsSliceState = { analytics: {} };

const slice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    load: (state, { payload }: PayloadAction<AnalyticsUser>) => {
      state.analytics.user = payload;
    },
    grantConsent: state => {
      state.analytics.consent = 'granted';
    },
    // Dropping the id is what makes a revoke a revoke: keeping it would let a
    // later opt-in re-attach everything reported before to the same person.
    revokeConsent: state => {
      state.analytics.consent = 'denied';
      state.analytics.user = undefined;
    },
    // Deliberately not `revokeConsent`: an id minted before the app asked must
    // go, but "not asked yet" is not an answer the app may record for the user.
    discardUser: state => {
      state.analytics.user = undefined;
    },
  },
  selectors: {
    selectAnalyticsUser: (state: Readonly<AnalyticsSliceState>) =>
      state.analytics.user,
    selectAnalyticsConsent: (state: Readonly<AnalyticsSliceState>) =>
      state.analytics.consent,
  },
});

/**
 * Whether analytics may identify the wallet and report events.
 *
 * Without `ANALYTICS_CONSENT_REQUIRED` this is always `true`, which is the
 * behaviour every app but the carbon guest ships. Do not invert the default:
 * an app that never declares the flag would silently stop reporting.
 */
const selectIsAnalyticsPermitted = createSelector(
  slice.selectors.selectAnalyticsConsent,
  featuresSelectors.features.selectLoadedFeatures,
  (consent, loaded) => {
    const isConsentRequired = loaded.featureFlags.some(
      flag => flag.key === ANALYTICS_CONSENT_FEATURE_FLAG,
    );
    if (!isConsentRequired) return true;
    return consent === 'granted';
  },
);

export const analyticsReducers = {
  [slice.name]: slice.reducer,
};

const trackEvent = createAction(
  'analytics/trackEvent',
  (payload: AnalyticsEvent) => ({
    payload,
  }),
);

/** Direct import of this is an anti-pattern. OK for tests. */
export const analyticsActions = {
  analytics: {
    ...slice.actions,
    trackEvent,
  },
};

/** Direct import of this is an anti-pattern. OK for tests. */
export const analyticsSelectors = {
  analytics: { ...slice.selectors, selectIsAnalyticsPermitted },
};

export type AnalyticsStoreState = StateFromReducersMapObject<
  typeof analyticsReducers
>;
