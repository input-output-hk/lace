/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useOnboardingCreateWallet } from '../../../src/pages/OnboardingCreateWallet/useOnboardingCreateWallet';

import type { StackRoutes, StackScreenProps } from '@lace-lib/navigation';
import type { BlockchainName } from '@lace-lib/util-store';

const mocks = vi.hoisted(() => ({
  useLaceSelector: vi.fn(),
  useDispatchLaceAction: vi.fn(),
  useLoadModules: vi.fn(),
  usePendingCreateWalletSecrets: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock('../../../src/hooks', () => ({
  useLaceSelector: mocks.useLaceSelector,
  useDispatchLaceAction: mocks.useDispatchLaceAction,
  useLoadModules: mocks.useLoadModules,
  usePendingCreateWalletSecrets: mocks.usePendingCreateWalletSecrets,
}));

vi.mock('@lace-contract/analytics', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAnalytics: () => ({ trackEvent: mocks.trackEvent }),
}));

vi.mock('@lace-contract/i18n', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@lace-lib/navigation', () => ({
  StackRoutes: {
    Home: 'Home',
    OnboardingDesktopLogin: 'OnboardingDesktopLogin',
  },
  TabRoutes: { Portfolio: 'Portfolio' },
}));

vi.mock('@lace-contract/onboarding-v2', () => ({
  clearPendingCreateWalletSecrets: vi.fn(),
  getPendingCreateWalletPasswordUtf8: () => 'pass',
}));

vi.mock('@lace-lib/ui-toolkit', () => ({
  useTheme: () => ({ theme: {} }),
}));

const attemptCreateWallet = vi.fn();
const resetCreateWalletStatus = vi.fn();

const renderCreateWallet = () => {
  const navigation = {
    reset: vi.fn(),
    goBack: vi.fn(),
    navigate: vi.fn(),
    addListener: vi.fn(() => vi.fn()),
  };
  const rendered = renderHook(() =>
    useOnboardingCreateWallet({
      navigation,
    } as unknown as StackScreenProps<StackRoutes.OnboardingCreateWallet>),
  );
  return { navigation, ...rendered };
};

describe('useOnboardingCreateWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useLaceSelector.mockImplementation((key: string) => {
      if (key === 'onboardingV2.selectIsCreatingWallet') return false;
      if (key === 'onboardingV2.selectLastCreatedWalletId') return undefined;
      if (key === 'onboardingV2.selectCreateWalletError') return null;
      return undefined;
    });
    mocks.useDispatchLaceAction.mockImplementation((name: string) =>
      name === 'onboardingV2.attemptCreateWallet'
        ? attemptCreateWallet
        : resetCreateWalletStatus,
    );
    mocks.useLoadModules.mockReturnValue([
      { blockchainName: 'Cardano' as BlockchainName },
    ]);
    mocks.usePendingCreateWalletSecrets.mockReturnValue({
      password: 'pass',
      recoveryPhrase: ['abandon'],
    });
  });

  it('enables Finish Setup once a blockchain is selected and a password is pending', () => {
    const { result } = renderCreateWallet();

    expect(result.current.isFinishDisabled).toBe(false);
    expect(result.current.isFinishLoading).toBe(false);
    expect(result.current.isAccountSelectionDisabled).toBe(false);
  });

  it('disables the button and shows the spinner as soon as Finish Setup is pressed', () => {
    const { result } = renderCreateWallet();

    act(() => {
      result.current.onFinishSetup();
    });

    expect(attemptCreateWallet).toHaveBeenCalledTimes(1);
    expect(result.current.isFinishDisabled).toBe(true);
    expect(result.current.isFinishLoading).toBe(true);
    expect(result.current.isAccountSelectionDisabled).toBe(true);
  });

  it('ignores a second Finish Setup press while a wallet is being created', () => {
    const { result } = renderCreateWallet();

    act(() => {
      result.current.onFinishSetup();
    });
    act(() => {
      result.current.onFinishSetup();
    });

    expect(attemptCreateWallet).toHaveBeenCalledTimes(1);
  });
});
