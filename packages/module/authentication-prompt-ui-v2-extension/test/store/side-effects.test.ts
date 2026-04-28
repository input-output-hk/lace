import { analyticsActions } from '@lace-contract/analytics';
import { authenticationPromptActions } from '@lace-contract/authentication-prompt';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, it } from 'vitest';

import { trackAppLockEvents } from '../../src/store/side-effects';

const actions = {
  ...analyticsActions,
  ...authenticationPromptActions,
};

describe('trackAppLockEvents', () => {
  it('emits biometric attempt event on confirmedBiometric', () => {
    testSideEffect(trackAppLockEvents, ({ cold, expectObservable }) => ({
      dependencies: { actions },
      actionObservables: {
        authenticationPrompt: {
          confirmedBiometric$: cold('a', {
            a: actions.authenticationPrompt.confirmedBiometric(),
          }),
          confirmedPassword$: cold(''),
          switchToPassword$: cold(''),
          verifiedBiometric$: cold(''),
          verifiedPassword$: cold(''),
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('a', {
          a: actions.analytics.trackEvent({
            eventName: 'app lock | biometric | attempt',
          }),
        });
      },
    }));
  });

  it('emits pin attempt event on confirmedPassword', () => {
    testSideEffect(trackAppLockEvents, ({ cold, expectObservable }) => ({
      dependencies: { actions },
      actionObservables: {
        authenticationPrompt: {
          confirmedBiometric$: cold(''),
          confirmedPassword$: cold('a', {
            a: actions.authenticationPrompt.confirmedPassword(),
          }),
          switchToPassword$: cold(''),
          verifiedBiometric$: cold(''),
          verifiedPassword$: cold(''),
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('a', {
          a: actions.analytics.trackEvent({
            eventName: 'app lock | pin | attempt',
          }),
        });
      },
    }));
  });

  it('emits biometric fallback to pin event on switchToPassword', () => {
    testSideEffect(trackAppLockEvents, ({ cold, expectObservable }) => ({
      dependencies: { actions },
      actionObservables: {
        authenticationPrompt: {
          confirmedBiometric$: cold(''),
          confirmedPassword$: cold(''),
          switchToPassword$: cold('a', {
            a: actions.authenticationPrompt.switchToPassword(),
          }),
          verifiedBiometric$: cold(''),
          verifiedPassword$: cold(''),
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('a', {
          a: actions.analytics.trackEvent({
            eventName: 'app lock | biometric | fallback to pin',
          }),
        });
      },
    }));
  });

  it('emits biometric success event on verifiedBiometric with success=true', () => {
    testSideEffect(trackAppLockEvents, ({ cold, expectObservable }) => ({
      dependencies: { actions },
      actionObservables: {
        authenticationPrompt: {
          confirmedBiometric$: cold(''),
          confirmedPassword$: cold(''),
          switchToPassword$: cold(''),
          verifiedBiometric$: cold('a', {
            a: actions.authenticationPrompt.verifiedBiometric({
              success: true,
            }),
          }),
          verifiedPassword$: cold(''),
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('a', {
          a: actions.analytics.trackEvent({
            eventName: 'app lock | biometric | success',
          }),
        });
      },
    }));
  });

  it('emits biometric failed event on verifiedBiometric with success=false', () => {
    testSideEffect(trackAppLockEvents, ({ cold, expectObservable }) => ({
      dependencies: { actions },
      actionObservables: {
        authenticationPrompt: {
          confirmedBiometric$: cold(''),
          confirmedPassword$: cold(''),
          switchToPassword$: cold(''),
          verifiedBiometric$: cold('a', {
            a: actions.authenticationPrompt.verifiedBiometric({
              success: false,
            }),
          }),
          verifiedPassword$: cold(''),
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('a', {
          a: actions.analytics.trackEvent({
            eventName: 'app lock | biometric | failed',
          }),
        });
      },
    }));
  });

  it('emits pin success event on verifiedPassword with success=true', () => {
    testSideEffect(trackAppLockEvents, ({ cold, expectObservable }) => ({
      dependencies: { actions },
      actionObservables: {
        authenticationPrompt: {
          confirmedBiometric$: cold(''),
          confirmedPassword$: cold(''),
          switchToPassword$: cold(''),
          verifiedBiometric$: cold(''),
          verifiedPassword$: cold('a', {
            a: actions.authenticationPrompt.verifiedPassword({ success: true }),
          }),
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('a', {
          a: actions.analytics.trackEvent({
            eventName: 'app lock | pin | success',
          }),
        });
      },
    }));
  });

  it('emits pin failed event on verifiedPassword with success=false', () => {
    testSideEffect(trackAppLockEvents, ({ cold, expectObservable }) => ({
      dependencies: { actions },
      actionObservables: {
        authenticationPrompt: {
          confirmedBiometric$: cold(''),
          confirmedPassword$: cold(''),
          switchToPassword$: cold(''),
          verifiedBiometric$: cold(''),
          verifiedPassword$: cold('a', {
            a: actions.authenticationPrompt.verifiedPassword({
              success: false,
            }),
          }),
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('a', {
          a: actions.analytics.trackEvent({
            eventName: 'app lock | pin | failed',
          }),
        });
      },
    }));
  });
});
