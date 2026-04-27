import { FeatureFlagKey } from '@lace-contract/feature';
import { testSideEffect } from '@lace-lib/util-dev';
import { of } from 'rxjs';
import { describe, it, vi, beforeEach, expect } from 'vitest';

import { authenticationPromptActions as actions } from '../../src';
import { createSecureStorePasswordManager } from '../../src/authenticators/password/secure-store-password-manager';
import {
  makeAuthenticationPreparingSideEffect,
  makeCheckBiometricAvailabilitySideEffect,
} from '../../src/store/side-effects/side-effects';

import type {
  Config,
  AuthenticationPromptSliceStatePreparing,
  AuthenticationPromptSliceState,
} from '../../src';
import type { LocalAuthenticationDependency } from '../../src';
import type { SecureStore } from '@lace-contract/secure-store';

// Mock @lace-lib/navigation
vi.mock('@lace-lib/navigation', () => ({
  navigationReferences: {},
  navigateAndReset: vi.fn(),
  navigate: vi.fn(),
}));

// Default test config
const config: Config = {
  purpose: 'wallet-unlock',
  confirmButtonLabel: 'authentication-prompt.confirm-button-label',
  message: 'authentication-prompt.message.wallet-lock',
};

/**
 * Creates a mock SecureStore
 */
const createMockSecureStore = (options?: {
  hasStoredPassword?: boolean;
  canUseBiometricAuth?: boolean;
}): SecureStore => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  deleteItemAsync: vi.fn(),
  canUseBiometricAuthentication: vi
    .fn()
    .mockReturnValue(options?.canUseBiometricAuth ?? true),
  isAvailableAsync: vi.fn().mockResolvedValue(true),
});

/**
 * Creates a mock password manager that returns hasStoredPassword
 */
const createMockPasswordManager = (hasStoredPassword: boolean) => ({
  hasStoredPassword: vi.fn().mockReturnValue(hasStoredPassword),
  clearPasswordFlag: vi.fn(),
  getPassword: vi.fn(),
  setPassword: vi.fn(),
  deletePassword: vi.fn(),
});

/**
 * Creates a mock LocalAuthenticationDependency with configurable enrolled level.
 * Pass boolean for biometric / none, or an explicit security level.
 */
const createMockLocalAuth = (
  level: boolean | 'biometric' | 'none' | 'secret',
): LocalAuthenticationDependency => {
  const enrolled: 'biometric' | 'none' | 'secret' =
    typeof level === 'boolean' ? (level ? 'biometric' : 'none') : level;
  return {
    getEnrolledLevel: vi.fn(() => of(enrolled)),
    authenticate: vi.fn(() => of({ success: true as const })),
    isEnrolled: vi.fn(() => of(enrolled !== 'none')),
  };
};

/**
 * Creates mock loaded features with optional enforcement flag
 */
const createMockLoadedFeatures = (enforceBiometric: boolean = false) => ({
  featureFlags: [
    {
      key: FeatureFlagKey('ENFORCE_BIOMETRIC_REQUIREMENT'),
      payload: { enabled: enforceBiometric },
    },
  ],
  modules: [],
});

// Mock the password manager module
vi.mock(
  '../../src/authenticators/password/secure-store-password-manager',
  () => ({
    createSecureStorePasswordManager: vi.fn(),
  }),
);

describe('makeAuthenticationPreparingSideEffect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when on web platform', () => {
    it('should open password auth on web platform', () => {
      const mockLocalAuth = createMockLocalAuth(false);
      const mockSecureStore = createMockSecureStore();
      const mockPasswordManager = createMockPasswordManager(false);
      vi.mocked(createSecureStorePasswordManager).mockReturnValue(
        mockPasswordManager as unknown as ReturnType<
          typeof createSecureStorePasswordManager
        >,
      );

      testSideEffect(
        makeAuthenticationPreparingSideEffect('web'),
        ({ cold, expectObservable }) => ({
          dependencies: {
            actions,
            secureStore: mockSecureStore,
            localAuthentication: mockLocalAuth,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.authenticationPrompt.openedPassword(),
            });
          },
          stateObservables: {
            authenticationPrompt: {
              selectState$: cold('a', {
                a: {
                  config,
                  status: 'Preparing',
                } satisfies AuthenticationPromptSliceStatePreparing,
              }),
            },
            features: {
              selectLoadedFeatures$: of(createMockLoadedFeatures(false)),
            },
          },
        }),
      );
    });
  });

  describe('when biometric password exists and device auth available', () => {
    it('should open biometric prompt when device auth and stored password are present', () => {
      const mockLocalAuth = createMockLocalAuth(true);
      const mockSecureStore = createMockSecureStore();
      const mockPasswordManager = createMockPasswordManager(true); // Has stored password
      vi.mocked(createSecureStorePasswordManager).mockReturnValue(
        mockPasswordManager as unknown as ReturnType<
          typeof createSecureStorePasswordManager
        >,
      );

      testSideEffect(
        makeAuthenticationPreparingSideEffect('ios'),
        ({ cold, expectObservable }) => ({
          dependencies: {
            actions,
            secureStore: mockSecureStore,
            localAuthentication: mockLocalAuth,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.authenticationPrompt.openedBiometric(),
            });
          },
          stateObservables: {
            authenticationPrompt: {
              selectState$: cold('a', {
                a: {
                  config,
                  status: 'Preparing',
                } satisfies AuthenticationPromptSliceStatePreparing,
              }),
            },
            features: {
              selectLoadedFeatures$: of(createMockLoadedFeatures(false)),
            },
          },
        }),
      );
    });
  });

  describe('when biometric password exists but device auth removed', () => {
    it('should show password prompt when enforcement disabled', () => {
      const mockLocalAuth = createMockLocalAuth(false); // Device auth NOT available
      const mockSecureStore = createMockSecureStore();
      const mockPasswordManager = createMockPasswordManager(true); // Has stored password flag
      vi.mocked(createSecureStorePasswordManager).mockReturnValue(
        mockPasswordManager as unknown as ReturnType<
          typeof createSecureStorePasswordManager
        >,
      );

      testSideEffect(
        makeAuthenticationPreparingSideEffect('ios'),
        ({ cold, expectObservable }) => ({
          dependencies: {
            actions,
            secureStore: mockSecureStore,
            localAuthentication: mockLocalAuth,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.authenticationPrompt.openedPassword(),
            });
          },
          stateObservables: {
            authenticationPrompt: {
              selectState$: cold('a', {
                a: {
                  config,
                  status: 'Preparing',
                } satisfies AuthenticationPromptSliceStatePreparing,
              }),
            },
            features: {
              selectLoadedFeatures$: of(createMockLoadedFeatures(false)),
            },
          },
        }),
      );
    });

    it('should show biometric required when enforcement enabled', () => {
      const mockLocalAuth = createMockLocalAuth(false); // Device auth NOT available
      const mockSecureStore = createMockSecureStore();
      const mockPasswordManager = createMockPasswordManager(true); // Has stored password flag
      vi.mocked(createSecureStorePasswordManager).mockReturnValue(
        mockPasswordManager as unknown as ReturnType<
          typeof createSecureStorePasswordManager
        >,
      );

      testSideEffect(
        makeAuthenticationPreparingSideEffect('ios'),
        ({ cold, expectObservable }) => ({
          dependencies: {
            actions,
            secureStore: mockSecureStore,
            localAuthentication: mockLocalAuth,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.authenticationPrompt.biometricRequired(),
            });
          },
          stateObservables: {
            authenticationPrompt: {
              selectState$: cold('a', {
                a: {
                  config,
                  status: 'Preparing',
                } satisfies AuthenticationPromptSliceStatePreparing,
              }),
            },
            features: {
              selectLoadedFeatures$: of(createMockLoadedFeatures(true)),
            },
          },
        }),
      );
    });
  });

  describe('when no stored password', () => {
    it('should open password auth when device auth not available and enforcement disabled', () => {
      const mockLocalAuth = createMockLocalAuth(false);
      const mockSecureStore = createMockSecureStore();
      const mockPasswordManager = createMockPasswordManager(false); // No stored password
      vi.mocked(createSecureStorePasswordManager).mockReturnValue(
        mockPasswordManager as unknown as ReturnType<
          typeof createSecureStorePasswordManager
        >,
      );

      testSideEffect(
        makeAuthenticationPreparingSideEffect('ios'),
        ({ cold, expectObservable }) => ({
          dependencies: {
            actions,
            secureStore: mockSecureStore,
            localAuthentication: mockLocalAuth,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.authenticationPrompt.openedPassword(),
            });
          },
          stateObservables: {
            authenticationPrompt: {
              selectState$: cold('a', {
                a: {
                  config,
                  status: 'Preparing',
                } satisfies AuthenticationPromptSliceStatePreparing,
              }),
            },
            features: {
              selectLoadedFeatures$: of(createMockLoadedFeatures(false)),
            },
          },
        }),
      );
    });

    it('should show biometric required when device auth not available and enforcement enabled', () => {
      const mockLocalAuth = createMockLocalAuth(false);
      const mockSecureStore = createMockSecureStore();
      const mockPasswordManager = createMockPasswordManager(false); // No stored password
      vi.mocked(createSecureStorePasswordManager).mockReturnValue(
        mockPasswordManager as unknown as ReturnType<
          typeof createSecureStorePasswordManager
        >,
      );

      testSideEffect(
        makeAuthenticationPreparingSideEffect('ios'),
        ({ cold, expectObservable }) => ({
          dependencies: {
            actions,
            secureStore: mockSecureStore,
            localAuthentication: mockLocalAuth,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.authenticationPrompt.biometricRequired(),
            });
          },
          stateObservables: {
            authenticationPrompt: {
              selectState$: cold('a', {
                a: {
                  config,
                  status: 'Preparing',
                } satisfies AuthenticationPromptSliceStatePreparing,
              }),
            },
            features: {
              selectLoadedFeatures$: of(createMockLoadedFeatures(true)),
            },
          },
        }),
      );
    });

    it('should open password auth when device auth available but no stored password', () => {
      const mockLocalAuth = createMockLocalAuth(true); // Device auth available
      const mockSecureStore = createMockSecureStore();
      const mockPasswordManager = createMockPasswordManager(false); // No stored password
      vi.mocked(createSecureStorePasswordManager).mockReturnValue(
        mockPasswordManager as unknown as ReturnType<
          typeof createSecureStorePasswordManager
        >,
      );

      testSideEffect(
        makeAuthenticationPreparingSideEffect('ios'),
        ({ cold, expectObservable }) => ({
          dependencies: {
            actions,
            secureStore: mockSecureStore,
            localAuthentication: mockLocalAuth,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.authenticationPrompt.openedPassword(),
            });
          },
          stateObservables: {
            authenticationPrompt: {
              selectState$: cold('a', {
                a: {
                  config,
                  status: 'Preparing',
                } satisfies AuthenticationPromptSliceStatePreparing,
              }),
            },
            features: {
              selectLoadedFeatures$: of(createMockLoadedFeatures(false)),
            },
          },
        }),
      );
    });
  });

  describe('edge cases', () => {
    it('should not emit when not in Preparing state', () => {
      const mockLocalAuth = createMockLocalAuth(true);
      const mockSecureStore = createMockSecureStore();
      const mockPasswordManager = createMockPasswordManager(false);
      vi.mocked(createSecureStorePasswordManager).mockReturnValue(
        mockPasswordManager as unknown as ReturnType<
          typeof createSecureStorePasswordManager
        >,
      );

      testSideEffect(
        makeAuthenticationPreparingSideEffect('ios'),
        ({ cold, expectObservable }) => ({
          dependencies: {
            actions,
            secureStore: mockSecureStore,
            localAuthentication: mockLocalAuth,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe(''); // No emissions
          },
          stateObservables: {
            authenticationPrompt: {
              selectState$: cold('a', {
                a: {
                  status: 'Idle',
                } as AuthenticationPromptSliceState,
              }),
            },
            features: {
              selectLoadedFeatures$: of(createMockLoadedFeatures(false)),
            },
          },
        }),
      );
    });

    it('should handle missing feature flags gracefully', () => {
      const mockLocalAuth = createMockLocalAuth(false);
      const mockSecureStore = createMockSecureStore();
      const mockPasswordManager = createMockPasswordManager(false);
      vi.mocked(createSecureStorePasswordManager).mockReturnValue(
        mockPasswordManager as unknown as ReturnType<
          typeof createSecureStorePasswordManager
        >,
      );

      testSideEffect(
        makeAuthenticationPreparingSideEffect('ios'),
        ({ cold, expectObservable }) => ({
          dependencies: {
            actions,
            secureStore: mockSecureStore,
            localAuthentication: mockLocalAuth,
          },
          assertion: sideEffect$ => {
            // Should default to password (enforcement not enabled)
            expectObservable(sideEffect$).toBe('a', {
              a: actions.authenticationPrompt.openedPassword(),
            });
          },
          stateObservables: {
            authenticationPrompt: {
              selectState$: cold('a', {
                a: {
                  config,
                  status: 'Preparing',
                } satisfies AuthenticationPromptSliceStatePreparing,
              }),
            },
            features: {
              selectLoadedFeatures$: of({ featureFlags: [], modules: [] }),
            },
          },
        }),
      );
    });

    it('should clear password flag when device auth removed and password still present', () => {
      const mockLocalAuth = createMockLocalAuth(false);
      const mockSecureStore = createMockSecureStore();
      const mockPasswordManager = createMockPasswordManager(true);
      vi.mocked(createSecureStorePasswordManager).mockReturnValue(
        mockPasswordManager as unknown as ReturnType<
          typeof createSecureStorePasswordManager
        >,
      );

      // Should not throw, should still emit openedPassword action
      testSideEffect(
        makeAuthenticationPreparingSideEffect('ios'),
        ({ cold, expectObservable }) => ({
          dependencies: {
            actions,
            secureStore: mockSecureStore,
            localAuthentication: mockLocalAuth,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.authenticationPrompt.openedPassword(),
            });
          },
          stateObservables: {
            authenticationPrompt: {
              selectState$: cold('a', {
                a: {
                  config,
                  status: 'Preparing',
                } satisfies AuthenticationPromptSliceStatePreparing,
              }),
            },
            features: {
              selectLoadedFeatures$: of(createMockLoadedFeatures(false)),
            },
          },
        }),
      );
    });

    it('should handle clearPasswordFlag failure gracefully', () => {
      const mockLocalAuth = createMockLocalAuth(false);
      const mockSecureStore = createMockSecureStore();
      const mockPasswordManager = createMockPasswordManager(true);
      mockPasswordManager.clearPasswordFlag.mockImplementation(() => {
        throw new Error('Failed to clear flag');
      });
      vi.mocked(createSecureStorePasswordManager).mockReturnValue(
        mockPasswordManager as unknown as ReturnType<
          typeof createSecureStorePasswordManager
        >,
      );

      // Should not throw, should still emit openedPassword action
      testSideEffect(
        makeAuthenticationPreparingSideEffect('ios'),
        ({ cold, expectObservable }) => ({
          dependencies: {
            actions,
            secureStore: mockSecureStore,
            localAuthentication: mockLocalAuth,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.authenticationPrompt.openedPassword(),
            });
          },
          stateObservables: {
            authenticationPrompt: {
              selectState$: cold('a', {
                a: {
                  config,
                  status: 'Preparing',
                } satisfies AuthenticationPromptSliceStatePreparing,
              }),
            },
            features: {
              selectLoadedFeatures$: of(createMockLoadedFeatures(false)),
            },
          },
        }),
      );
    });
  });

  describe('android platform-specific behavior', () => {
    it('should open biometric prompt on android with biometric enrollment and stored password', () => {
      const mockLocalAuth = createMockLocalAuth('biometric');
      const mockSecureStore = createMockSecureStore();
      const mockPasswordManager = createMockPasswordManager(true);
      vi.mocked(createSecureStorePasswordManager).mockReturnValue(
        mockPasswordManager as unknown as ReturnType<
          typeof createSecureStorePasswordManager
        >,
      );

      testSideEffect(
        makeAuthenticationPreparingSideEffect('android'),
        ({ cold, expectObservable }) => ({
          dependencies: {
            actions,
            secureStore: mockSecureStore,
            localAuthentication: mockLocalAuth,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.authenticationPrompt.openedBiometric(),
            });
          },
          stateObservables: {
            authenticationPrompt: {
              selectState$: cold('a', {
                a: {
                  config,
                  status: 'Preparing',
                } satisfies AuthenticationPromptSliceStatePreparing,
              }),
            },
            features: {
              selectLoadedFeatures$: of(createMockLoadedFeatures(false)),
            },
          },
        }),
      );
    });

    it('treats secret (PIN-only) as no device auth on android, clears flag and opens password', () => {
      const mockLocalAuth = createMockLocalAuth('secret'); // Android treats this as no device auth
      const mockSecureStore = createMockSecureStore();
      const mockPasswordManager = createMockPasswordManager(true);
      vi.mocked(createSecureStorePasswordManager).mockReturnValue(
        mockPasswordManager as unknown as ReturnType<
          typeof createSecureStorePasswordManager
        >,
      );

      testSideEffect(
        makeAuthenticationPreparingSideEffect('android'),
        ({ cold, expectObservable, flush }) => ({
          dependencies: {
            actions,
            secureStore: mockSecureStore,
            localAuthentication: mockLocalAuth,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.authenticationPrompt.openedPassword(),
            });
            flush();
            expect(mockPasswordManager.clearPasswordFlag).toHaveBeenCalled();
          },
          stateObservables: {
            authenticationPrompt: {
              selectState$: cold('a', {
                a: {
                  config,
                  status: 'Preparing',
                } satisfies AuthenticationPromptSliceStatePreparing,
              }),
            },
            features: {
              selectLoadedFeatures$: of(createMockLoadedFeatures(false)),
            },
          },
        }),
      );
    });

    it('treats secret (PIN-only) as no device auth on android and requires biometric when enforcement is enabled', () => {
      const mockLocalAuth = createMockLocalAuth('secret');
      const mockSecureStore = createMockSecureStore();
      const mockPasswordManager = createMockPasswordManager(false);
      vi.mocked(createSecureStorePasswordManager).mockReturnValue(
        mockPasswordManager as unknown as ReturnType<
          typeof createSecureStorePasswordManager
        >,
      );

      testSideEffect(
        makeAuthenticationPreparingSideEffect('android'),
        ({ cold, expectObservable }) => ({
          dependencies: {
            actions,
            secureStore: mockSecureStore,
            localAuthentication: mockLocalAuth,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.authenticationPrompt.biometricRequired(),
            });
          },
          stateObservables: {
            authenticationPrompt: {
              selectState$: cold('a', {
                a: {
                  config,
                  status: 'Preparing',
                } satisfies AuthenticationPromptSliceStatePreparing,
              }),
            },
            features: {
              selectLoadedFeatures$: of(createMockLoadedFeatures(true)),
            },
          },
        }),
      );
    });
  });
});

describe('makeCheckBiometricAvailabilitySideEffect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should dispatch isDeviceAuthAvailable=false on web platform', () => {
    const mockLocalAuth = createMockLocalAuth(true);
    const mockSecureStore = createMockSecureStore({
      canUseBiometricAuth: true,
    });

    testSideEffect(
      makeCheckBiometricAvailabilitySideEffect('web'),
      ({ cold, expectObservable }) => ({
        dependencies: {
          actions,
          secureStore: mockSecureStore,
          localAuthentication: mockLocalAuth,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('100ms a', {
            a: actions.authenticationPrompt.updateBiometricInfo({
              isDeviceAuthAvailable: false,
            }),
          });
        },
        actionObservables: {
          authenticationPrompt: {
            checkBiometricAvailability$: cold('a', {
              a: actions.authenticationPrompt.checkBiometricAvailability(),
            }),
          },
        },
        stateObservables: {},
      }),
    );
  });

  it('should dispatch isDeviceAuthAvailable=true when both deviceAuth and secureStore available on ios', () => {
    const mockLocalAuth = createMockLocalAuth(true);
    const mockSecureStore = createMockSecureStore({
      canUseBiometricAuth: true,
    });

    testSideEffect(
      makeCheckBiometricAvailabilitySideEffect('ios'),
      ({ cold, expectObservable }) => ({
        dependencies: {
          actions,
          secureStore: mockSecureStore,
          localAuthentication: mockLocalAuth,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('100ms a', {
            a: actions.authenticationPrompt.updateBiometricInfo({
              isDeviceAuthAvailable: true,
            }),
          });
        },
        actionObservables: {
          authenticationPrompt: {
            checkBiometricAvailability$: cold('a', {
              a: actions.authenticationPrompt.checkBiometricAvailability(),
            }),
          },
        },
        stateObservables: {},
      }),
    );
  });

  it('should dispatch isDeviceAuthAvailable=false when deviceAuth available but secureStore cannot use biometrics on android', () => {
    const mockLocalAuth = createMockLocalAuth(true); // Device auth available
    const mockSecureStore = createMockSecureStore({
      canUseBiometricAuth: false,
    }); // But biometrics not usable

    testSideEffect(
      makeCheckBiometricAvailabilitySideEffect('android'),
      ({ cold, expectObservable }) => ({
        dependencies: {
          actions,
          secureStore: mockSecureStore,
          localAuthentication: mockLocalAuth,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('100ms a', {
            a: actions.authenticationPrompt.updateBiometricInfo({
              isDeviceAuthAvailable: false,
            }),
          });
        },
        actionObservables: {
          authenticationPrompt: {
            checkBiometricAvailability$: cold('a', {
              a: actions.authenticationPrompt.checkBiometricAvailability(),
            }),
          },
        },
        stateObservables: {},
      }),
    );
  });

  it('should dispatch isDeviceAuthAvailable=false when deviceAuth not available', () => {
    const mockLocalAuth = createMockLocalAuth(false); // Device auth NOT available
    const mockSecureStore = createMockSecureStore({
      canUseBiometricAuth: true,
    });

    testSideEffect(
      makeCheckBiometricAvailabilitySideEffect('ios'),
      ({ cold, expectObservable }) => ({
        dependencies: {
          actions,
          secureStore: mockSecureStore,
          localAuthentication: mockLocalAuth,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('100ms a', {
            a: actions.authenticationPrompt.updateBiometricInfo({
              isDeviceAuthAvailable: false,
            }),
          });
        },
        actionObservables: {
          authenticationPrompt: {
            checkBiometricAvailability$: cold('a', {
              a: actions.authenticationPrompt.checkBiometricAvailability(),
            }),
          },
        },
        stateObservables: {},
      }),
    );
  });

  it('should dispatch isDeviceAuthAvailable=true on android with biometric enrollment', () => {
    const mockLocalAuth = createMockLocalAuth('biometric');
    const mockSecureStore = createMockSecureStore({
      canUseBiometricAuth: true,
    });

    testSideEffect(
      makeCheckBiometricAvailabilitySideEffect('android'),
      ({ cold, expectObservable }) => ({
        dependencies: {
          actions,
          secureStore: mockSecureStore,
          localAuthentication: mockLocalAuth,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('100ms a', {
            a: actions.authenticationPrompt.updateBiometricInfo({
              isDeviceAuthAvailable: true,
            }),
          });
        },
        actionObservables: {
          authenticationPrompt: {
            checkBiometricAvailability$: cold('a', {
              a: actions.authenticationPrompt.checkBiometricAvailability(),
            }),
          },
        },
        stateObservables: {},
      }),
    );
  });

  it('should dispatch isDeviceAuthAvailable=false on android with only secret enrollment', () => {
    const mockLocalAuth = createMockLocalAuth('secret');
    const mockSecureStore = createMockSecureStore({
      canUseBiometricAuth: true,
    });

    testSideEffect(
      makeCheckBiometricAvailabilitySideEffect('android'),
      ({ cold, expectObservable }) => ({
        dependencies: {
          actions,
          secureStore: mockSecureStore,
          localAuthentication: mockLocalAuth,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('100ms a', {
            a: actions.authenticationPrompt.updateBiometricInfo({
              isDeviceAuthAvailable: false,
            }),
          });
        },
        actionObservables: {
          authenticationPrompt: {
            checkBiometricAvailability$: cold('a', {
              a: actions.authenticationPrompt.checkBiometricAvailability(),
            }),
          },
        },
        stateObservables: {},
      }),
    );
  });

  it('should handle multiple availability checks', () => {
    const mockLocalAuth = createMockLocalAuth(true);
    const mockSecureStore = createMockSecureStore({
      canUseBiometricAuth: true,
    });

    testSideEffect(
      makeCheckBiometricAvailabilitySideEffect('ios'),
      ({ cold, expectObservable }) => ({
        dependencies: {
          actions,
          secureStore: mockSecureStore,
          localAuthentication: mockLocalAuth,
        },
        assertion: sideEffect$ => {
          // Two checks should produce two results, delayed 100ms each
          expectObservable(sideEffect$).toBe('100ms a-b', {
            a: actions.authenticationPrompt.updateBiometricInfo({
              isDeviceAuthAvailable: true,
            }),
            b: actions.authenticationPrompt.updateBiometricInfo({
              isDeviceAuthAvailable: true,
            }),
          });
        },
        actionObservables: {
          authenticationPrompt: {
            checkBiometricAvailability$: cold('a-b', {
              a: actions.authenticationPrompt.checkBiometricAvailability(),
              b: actions.authenticationPrompt.checkBiometricAvailability(),
            }),
          },
        },
        stateObservables: {},
      }),
    );
  });
});
