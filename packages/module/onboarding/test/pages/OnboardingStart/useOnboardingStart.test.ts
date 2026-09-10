/**
 * @vitest-environment jsdom
 */
import { clearPendingCreateWalletSecrets } from '@lace-contract/onboarding-v2';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock react-native to avoid a parse failure in the jsdom environment.
vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

// Mock @lace-lib/ui-toolkit to avoid pulling in react-native at import time.
vi.mock('@lace-lib/ui-toolkit', () => ({
  openUrl: vi.fn(),
  useTheme: () => ({ theme: {} }),
}));

vi.mock('@lace-contract/analytics', () => ({
  useAnalytics: () => ({ trackEvent: vi.fn() }),
}));

vi.mock('@lace-contract/app', () => ({
  useConfig: () => ({ appConfig: undefined }),
  // Module-contributed entry options: none here, so the hook's own entries are
  // what these tests observe.
  useUICustomisation: () => [],
}));

vi.mock('@lace-contract/feature', () => ({
  FeatureFlagKey: (key: string) => key,
}));

vi.mock('@lace-contract/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@lace-contract/onboarding-v2', () => ({
  clearPendingCreateWalletSecrets: vi.fn(),
}));

vi.mock('@lace-lib/navigation', () => ({
  StackRoutes: {
    OnboardingStart: 'OnboardingStart',
    OnboardingHardware: 'OnboardingHardware',
  },
}));

const mocks = vi.hoisted(() => ({
  // `useLoadModules` returns undefined until the addon promise lands, then an
  // array with one entry per implementer.
  vaultCapabilities: undefined as unknown,
  onboardingOptions: undefined as unknown,
}));

vi.mock('../../../src/hooks', () => ({
  useDispatchLaceAction: () => vi.fn(),
  useLaceSelector: () => undefined,
  useLoadModules: (key: string) =>
    key === 'addons.loadVaultCapabilities'
      ? mocks.vaultCapabilities
      : mocks.onboardingOptions,
}));

import { useOnboardingStart } from '../../../src/pages/OnboardingStart/useOnboardingStart';

import type { StackRoutes, StackScreenProps } from '@lace-lib/navigation';

beforeEach(() => {
  mocks.vaultCapabilities = [
    { create: true, import: true, connectHardware: false, addAccount: false },
  ];
  mocks.onboardingOptions = [[]];
});

const props = {
  navigation: { navigate: vi.fn(), addListener: vi.fn() },
} as unknown as StackScreenProps<StackRoutes.OnboardingStart>;

const findAction = (
  result: { current: ReturnType<typeof useOnboardingStart> },
  testID: string,
) => {
  const action = result.current.actions.find(item => item.testID === testID);
  if (!action) throw new Error(`action ${testID} not found`);
  return action;
};

const testIDs = (result: {
  current: ReturnType<typeof useOnboardingStart>;
}): (string | undefined)[] => result.current.actions.map(item => item.testID);

describe('useOnboardingStart vault-capability gating', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('hides the create and import entries while the capabilities promise is unresolved', () => {
    mocks.vaultCapabilities = undefined;

    const { result } = renderHook(() => useOnboardingStart(props));

    expect(testIDs(result)).toEqual([]);
  });

  it('hides the create and import entries when the host advertises neither ceremony', () => {
    mocks.vaultCapabilities = [
      {
        create: false,
        import: false,
        connectHardware: false,
        addAccount: false,
      },
    ];

    const { result } = renderHook(() => useOnboardingStart(props));

    expect(testIDs(result)).toEqual([]);
  });

  it('gates each entry on its own capability', () => {
    mocks.vaultCapabilities = [
      {
        create: false,
        import: true,
        connectHardware: false,
        addAccount: false,
      },
    ];

    const { result } = renderHook(() => useOnboardingStart(props));

    expect(testIDs(result)).toEqual(['onboarding-start-restore-wallet-button']);
  });

  // The hardware entry rides the app-local onboarding-options list, not the
  // host capability set — which is why a total capability-detection failure
  // still leaves exactly one tile on screen.
  it('keeps the hardware entry when every vault capability is false', () => {
    mocks.vaultCapabilities = [
      {
        create: false,
        import: false,
        connectHardware: false,
        addAccount: false,
      },
    ];
    mocks.onboardingOptions = [[{ id: 'ledger', isHwDevice: true }]];

    const { result } = renderHook(() => useOnboardingStart(props));

    expect(testIDs(result)).toEqual([
      'onboarding-start-hardware-wallet-button',
    ]);
  });
});

// The buffer is a module singleton in the UI process; the ceremony side effect
// answering these intents can run in another one, so only the hook can clear it.
describe('useOnboardingStart staged secrets', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('discards the staged create secrets before requesting the create ceremony', () => {
    const { result } = renderHook(() => useOnboardingStart(props));

    act(() => {
      findAction(result, 'onboarding-start-create-wallet-button').onPress?.();
    });

    expect(clearPendingCreateWalletSecrets).toHaveBeenCalledTimes(1);
  });

  it('discards the staged create secrets before requesting the import ceremony', () => {
    const { result } = renderHook(() => useOnboardingStart(props));

    act(() => {
      findAction(result, 'onboarding-start-restore-wallet-button').onPress?.();
    });

    expect(clearPendingCreateWalletSecrets).toHaveBeenCalledTimes(1);
  });
});

describe('useOnboardingStart setting-up overlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('shows the overlay when the create wallet action is triggered', () => {
    const { result } = renderHook(() => useOnboardingStart(props));

    expect(result.current.isSettingUp).toBe(false);

    act(() => {
      findAction(result, 'onboarding-start-create-wallet-button').onPress?.();
    });

    expect(result.current.isSettingUp).toBe(true);
  });

  it('shows the overlay when the restore wallet action is triggered', () => {
    const { result } = renderHook(() => useOnboardingStart(props));

    expect(result.current.isSettingUp).toBe(false);

    act(() => {
      findAction(result, 'onboarding-start-restore-wallet-button').onPress?.();
    });

    expect(result.current.isSettingUp).toBe(true);
  });

  it('hides the overlay after the grace period once the window regains focus', () => {
    const { result } = renderHook(() => useOnboardingStart(props));

    act(() => {
      findAction(result, 'onboarding-start-create-wallet-button').onPress?.();
    });
    expect(result.current.isSettingUp).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.isSettingUp).toBe(false);
  });

  it('keeps the overlay visible before the grace period elapses', () => {
    const { result } = renderHook(() => useOnboardingStart(props));

    act(() => {
      findAction(result, 'onboarding-start-create-wallet-button').onPress?.();
    });

    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    act(() => {
      vi.advanceTimersByTime(4999);
    });

    expect(result.current.isSettingUp).toBe(true);
  });

  it('hides the overlay when the screen regains navigation focus', () => {
    let focusListener: (() => void) | undefined;
    const navigationProps = {
      navigation: {
        navigate: vi.fn(),
        addListener: (event: string, listener: () => void) => {
          if (event === 'focus') focusListener = listener;
          return vi.fn();
        },
      },
    } as unknown as StackScreenProps<StackRoutes.OnboardingStart>;
    const { result } = renderHook(() => useOnboardingStart(navigationProps));

    act(() => {
      findAction(result, 'onboarding-start-create-wallet-button').onPress?.();
    });
    expect(result.current.isSettingUp).toBe(true);

    act(() => {
      focusListener?.();
    });

    expect(result.current.isSettingUp).toBe(false);
  });

  it('removes the focus listener on unmount so the timer cannot fire', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { result, unmount } = renderHook(() => useOnboardingStart(props));

    act(() => {
      findAction(result, 'onboarding-start-create-wallet-button').onPress?.();
    });

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('focus', expect.any(Function));
    removeSpy.mockRestore();
  });
});
