import { testSideEffect } from '@lace-lib/util-dev';
import { throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { pushLanguage } from '../src/store/side-effects/push-language';

import type { SupportedLanguage } from '@lace-contract/i18n';
import type {
  LaceResult,
  SetLanguageResult,
} from '@lace-lib/extension-shell-api';

// Pin the device language so the no-explicit-preference case is deterministic
// across machines (the real getSystemLanguage resolves the host OS locale).
// The side effect's only runtime import from the contract is getSystemLanguage.
vi.mock('@lace-contract/i18n', () => ({
  getSystemLanguage: (): SupportedLanguage => 'ja',
}));

const recorded: LaceResult<SetLanguageResult> = {
  ok: true,
  value: { recorded: true },
};

describe('i18n pushLanguage side effect', () => {
  it('pushes the explicit language on boot and dispatches nothing', () => {
    const calls: string[] = [];
    testSideEffect(pushLanguage, ({ cold, expectObservable }) => ({
      actionObservables: {},
      stateObservables: {
        views: {
          selectLanguage$: cold<SupportedLanguage>('a', { a: 'es' }),
          selectHasExplicitLanguagePreference$: cold<boolean>('a', {
            a: true,
          }),
        },
      },
      dependencies: {
        canSetLanguage: true,
        pushLanguageToHost: (language: string) => {
          calls.push(language);
          return cold('(a|)', { a: recorded });
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('');
      },
    }));
    expect(calls).toEqual(['es']);
  });

  it('pushes the device language while no explicit preference is set', () => {
    const calls: string[] = [];
    testSideEffect(pushLanguage, ({ cold, expectObservable }) => ({
      actionObservables: {},
      stateObservables: {
        views: {
          // The slice value is NOT what the guest renders without an explicit
          // preference — the effective (device) language is what gets pushed.
          selectLanguage$: cold<SupportedLanguage>('a', { a: 'es' }),
          selectHasExplicitLanguagePreference$: cold<boolean>('a', {
            a: false,
          }),
        },
      },
      dependencies: {
        canSetLanguage: true,
        pushLanguageToHost: (language: string) => {
          calls.push(language);
          return cold('(a|)', { a: recorded });
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('');
      },
    }));
    expect(calls).toEqual(['ja']);
  });

  it('re-pushes on a language change and dedupes an unchanged value', () => {
    const calls: string[] = [];
    testSideEffect(pushLanguage, ({ cold, expectObservable }) => ({
      actionObservables: {},
      stateObservables: {
        views: {
          // es, then es again (deduped), then ja (re-push).
          selectLanguage$: cold<SupportedLanguage>('a 4ms b 4ms c', {
            a: 'es',
            b: 'es',
            c: 'ja',
          }),
          selectHasExplicitLanguagePreference$: cold<boolean>('a', {
            a: true,
          }),
        },
      },
      dependencies: {
        canSetLanguage: true,
        pushLanguageToHost: (language: string) => {
          calls.push(language);
          return cold('(a|)', { a: recorded });
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('');
      },
    }));
    expect(calls).toEqual(['es', 'ja']);
  });

  it('no-ops silently against an older host lacking the capability', () => {
    const calls: string[] = [];
    testSideEffect(pushLanguage, ({ cold, expectObservable }) => ({
      actionObservables: {},
      stateObservables: {
        views: {
          selectLanguage$: cold<SupportedLanguage>('a', { a: 'es' }),
          selectHasExplicitLanguagePreference$: cold<boolean>('a', {
            a: true,
          }),
        },
      },
      dependencies: {
        canSetLanguage: false,
        pushLanguageToHost: (language: string) => {
          calls.push(language);
          return cold('(a|)', { a: recorded });
        },
      },
      // Disabled: returns EMPTY (completes at frame 0), never touching the wire.
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('|');
      },
    }));
    expect(calls).toEqual([]);
  });

  it('swallows a wire failure without breaking the guest', () => {
    const calls: string[] = [];
    testSideEffect(pushLanguage, ({ cold, expectObservable }) => ({
      actionObservables: {},
      stateObservables: {
        views: {
          selectLanguage$: cold<SupportedLanguage>('a', { a: 'es' }),
          selectHasExplicitLanguagePreference$: cold<boolean>('a', {
            a: true,
          }),
        },
      },
      dependencies: {
        canSetLanguage: true,
        pushLanguageToHost: (language: string) => {
          calls.push(language);
          return throwError(() => new Error('wire down'));
        },
      },
      // No error notification reaches the merged action stream (the swallow).
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('');
      },
    }));
    expect(calls).toEqual(['es']);
  });
});
