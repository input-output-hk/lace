/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useOnboardingDesktopLogin } from '../../../src/pages/OnboardingDesktopLogin/useOnboardingDesktopLogin';

import type { StackRoutes, StackScreenProps } from '@lace-lib/navigation';

vi.mock('@lace-contract/analytics', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAnalytics: () => ({ trackEvent: vi.fn() }),
}));

vi.mock('@lace-contract/i18n', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@lace-contract/onboarding-v2', () => ({
  clearPendingCreateWalletSecrets: vi.fn(),
  setPendingCreateWalletSecrets: vi.fn(),
}));

vi.mock('@lace-lib/navigation', () => ({
  StackRoutes: {
    OnboardingDesktopLogin: 'OnboardingDesktopLogin',
    OnboardingHardwareSetup: 'OnboardingHardwareSetup',
    OnboardingCreateWallet: 'OnboardingCreateWallet',
  },
}));

vi.mock('@lace-lib/ui-toolkit', () => ({
  useTheme: () => ({ theme: {} }),
}));

vi.mock('../../../src/hooks', () => ({
  useDispatchLaceAction: () => vi.fn(),
}));

vi.mock('../../../src/hooks/usePasswordStrength', () => ({
  usePasswordStrength: () => ({ feedback: undefined, isStrong: false }),
}));

const makeProps = (
  params: Record<string, unknown>,
): StackScreenProps<StackRoutes.OnboardingDesktopLogin> =>
  ({
    navigation: { navigate: vi.fn(), goBack: vi.fn() },
    route: { params },
  } as unknown as StackScreenProps<StackRoutes.OnboardingDesktopLogin>);

describe('useOnboardingDesktopLogin', () => {
  it('shows the recovery-phrase note for software onboarding', () => {
    const { result } = renderHook(() =>
      useOnboardingDesktopLogin(makeProps({})),
    );
    expect(result.current.passwordRecoveryNote).toBe(
      'onboarding.desktop-login.password-recovery-note',
    );
  });

  it('shows the hardware-specific recovery note on the hardware-wallet path (device re-add, not a recovery phrase)', () => {
    const { result } = renderHook(() =>
      useOnboardingDesktopLogin(
        makeProps({ hardwareSetup: { walletName: 'x' } }),
      ),
    );
    expect(result.current.passwordRecoveryNote).toBe(
      'onboarding.desktop-login.password-recovery-note-hardware',
    );
  });
});
