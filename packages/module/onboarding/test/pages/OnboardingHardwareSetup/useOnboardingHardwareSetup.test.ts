/**
 * @vitest-environment jsdom
 */
import { WalletType } from '@lace-contract/wallet-repo';
import { HardwareIntegrationId } from '@lace-lib/util-hw';
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useOnboardingHardwareSetup } from '../../../src/pages/OnboardingHardwareSetup/useOnboardingHardwareSetup';

import type { HwBlockchainSupport } from '@lace-contract/onboarding-v2';
import type { StackRoutes, StackScreenProps } from '@lace-lib/navigation';
import type { BlockchainName } from '@lace-lib/util-store';

const mocks = vi.hoisted(() => ({
  useLaceSelector: vi.fn(),
  useDispatchLaceAction: vi.fn(),
  useLoadModules: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock('../../../src/hooks', () => ({
  useLaceSelector: mocks.useLaceSelector,
  useDispatchLaceAction: mocks.useDispatchLaceAction,
  useLoadModules: mocks.useLoadModules,
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
  StackRoutes: { Home: 'Home' },
  TabRoutes: { Portfolio: 'Portfolio' },
}));

const CARDANO_OPTION_ID = HardwareIntegrationId('seed-signer');
const BITCOIN_OPTION_ID = HardwareIntegrationId('seed-signer-bitcoin');
const KEYSTONE_BITCOIN_OPTION_ID = HardwareIntegrationId('keystone-bitcoin');

const seedSignerSupport: HwBlockchainSupport[][] = [
  [
    {
      deviceOptionId: CARDANO_OPTION_ID,
      walletType: WalletType.HardwareSeedSigner,
      blockchainName: 'Cardano' as BlockchainName,
    },
    {
      deviceOptionId: BITCOIN_OPTION_ID,
      walletType: WalletType.HardwareSeedSigner,
      blockchainName: 'Bitcoin' as BlockchainName,
      accountSelection: 'device',
    },
  ],
];

const KEYSTONE_CARDANO_OPTION_ID = HardwareIntegrationId('keystone');

const keystoneSupport: HwBlockchainSupport[][] = [
  [
    {
      deviceOptionId: KEYSTONE_CARDANO_OPTION_ID,
      walletType: WalletType.HardwareKeystone,
      blockchainName: 'Cardano' as BlockchainName,
      maxAccountIndex: 24,
    },
    {
      deviceOptionId: KEYSTONE_BITCOIN_OPTION_ID,
      walletType: WalletType.HardwareKeystone,
      blockchainName: 'Bitcoin' as BlockchainName,
      accountSelection: 'device',
    },
  ],
];

const TREZOR_CARDANO_OPTION_ID = HardwareIntegrationId('trezor');
const TREZOR_BITCOIN_OPTION_ID = HardwareIntegrationId('trezor-bitcoin');

const trezorSupport: HwBlockchainSupport[][] = [
  [
    {
      deviceOptionId: TREZOR_CARDANO_OPTION_ID,
      walletType: WalletType.HardwareTrezor,
      blockchainName: 'Cardano' as BlockchainName,
    },
    {
      deviceOptionId: TREZOR_BITCOIN_OPTION_ID,
      walletType: WalletType.HardwareTrezor,
      blockchainName: 'Bitcoin' as BlockchainName,
    },
  ],
];

const attemptCreateHardwareWallet = vi.fn();
const resetCreateWalletStatus = vi.fn();

const renderSetup = ({
  optionId,
  blockchainName,
  support,
  walletType = WalletType.HardwareSeedSigner,
}: {
  optionId: HardwareIntegrationId;
  blockchainName: BlockchainName;
  support: HwBlockchainSupport[][] | undefined;
  walletType?: WalletType;
}) => {
  mocks.useLoadModules.mockReturnValue(support);
  const navigation = { reset: vi.fn(), goBack: vi.fn() };
  const route = {
    params: {
      optionId,
      walletType,
      derivationTypes: ['ICARUS'],
      blockchainName,
    },
  };
  const rendered = renderHook(() =>
    useOnboardingHardwareSetup({
      navigation,
      route,
    } as unknown as StackScreenProps<StackRoutes.OnboardingHardwareSetup>),
  );
  return { navigation, ...rendered };
};

describe('useOnboardingHardwareSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useLaceSelector.mockImplementation((key: string) => {
      if (key === 'onboardingV2.selectIsCreatingWallet') return false;
      if (key === 'onboardingV2.selectCreateWalletError') return null;
      return undefined;
    });
    mocks.useDispatchLaceAction.mockImplementation((name: string) =>
      name === 'onboardingV2.attemptCreateHardwareWallet'
        ? attemptCreateHardwareWallet
        : resetCreateWalletStatus,
    );
  });

  it('shows account setup when the support entry uses app-side account selection', () => {
    const { result } = renderSetup({
      optionId: CARDANO_OPTION_ID,
      blockchainName: 'Cardano' as BlockchainName,
      support: seedSignerSupport,
    });

    expect(result.current.hasAccountSetup).toBe(true);
    expect(result.current.instructionText).toBeUndefined();
    expect(result.current.derivationTypeOptions).toEqual([
      expect.objectContaining({ value: 'ICARUS' }),
    ]);

    act(() => {
      result.current.onCreateWallet();
    });

    expect(attemptCreateHardwareWallet).toHaveBeenCalledWith(
      expect.objectContaining({
        optionId: CARDANO_OPTION_ID,
        accountIndex: 0,
        derivationType: 'ICARUS',
        blockchainName: 'Cardano',
      }),
    );
  });

  it('hides the derivation type picker for an app-driven Bitcoin setup', () => {
    const { result } = renderSetup({
      optionId: TREZOR_BITCOIN_OPTION_ID,
      blockchainName: 'Bitcoin' as BlockchainName,
      support: trezorSupport,
      walletType: WalletType.HardwareTrezor,
    });

    expect(result.current.hasAccountSetup).toBe(true);
    expect(result.current.derivationTypeOptions).toBeUndefined();
    expect(result.current.derivationType).toBeUndefined();

    act(() => {
      result.current.onCreateWallet();
    });

    expect(attemptCreateHardwareWallet).toHaveBeenCalledWith(
      expect.objectContaining({
        optionId: TREZOR_BITCOIN_OPTION_ID,
        accountIndex: 0,
        derivationType: undefined,
        blockchainName: 'Bitcoin',
      }),
    );
  });

  it('keeps the derivation type picker for an app-driven Cardano setup', () => {
    const { result } = renderSetup({
      optionId: TREZOR_CARDANO_OPTION_ID,
      blockchainName: 'Cardano' as BlockchainName,
      support: trezorSupport,
      walletType: WalletType.HardwareTrezor,
    });

    expect(result.current.hasAccountSetup).toBe(true);
    expect(result.current.derivationTypeOptions).toEqual([
      expect.objectContaining({ value: 'ICARUS' }),
    ]);
    expect(result.current.derivationType).toBe('ICARUS');
  });

  it('hides account setup when the support entry declares device account selection', () => {
    const { result } = renderSetup({
      optionId: BITCOIN_OPTION_ID,
      blockchainName: 'Bitcoin' as BlockchainName,
      support: seedSignerSupport,
    });

    expect(result.current.hasAccountSetup).toBe(false);
    expect(result.current.instructionText).toBe(
      'v2.seed-signer-bitcoin.import.instruction',
    );

    act(() => {
      result.current.onCreateWallet();
    });

    expect(attemptCreateHardwareWallet).toHaveBeenCalledWith(
      expect.objectContaining({
        optionId: BITCOIN_OPTION_ID,
        accountIndex: 0,
        derivationType: undefined,
        blockchainName: 'Bitcoin',
      }),
    );
  });

  it('surfaces the device max account index for a capped Cardano setup', () => {
    const { result } = renderSetup({
      optionId: KEYSTONE_CARDANO_OPTION_ID,
      blockchainName: 'Cardano' as BlockchainName,
      support: keystoneSupport,
      walletType: WalletType.HardwareKeystone,
    });

    expect(result.current.hasAccountSetup).toBe(true);
    expect(result.current.maxAccountIndex).toBe(24);
  });

  it('leaves the max account index undefined when the device declares no limit', () => {
    const { result } = renderSetup({
      optionId: TREZOR_CARDANO_OPTION_ID,
      blockchainName: 'Cardano' as BlockchainName,
      support: trezorSupport,
      walletType: WalletType.HardwareTrezor,
    });

    expect(result.current.maxAccountIndex).toBeUndefined();
  });

  it('shows the Keystone import instruction for the keystone-bitcoin option', () => {
    const { result } = renderSetup({
      optionId: KEYSTONE_BITCOIN_OPTION_ID,
      blockchainName: 'Bitcoin' as BlockchainName,
      support: keystoneSupport,
    });

    expect(result.current.hasAccountSetup).toBe(false);
    expect(result.current.instructionText).toBe(
      'v2.keystone-bitcoin.import.instruction',
    );
  });

  it('defaults to account setup while the support addons are still loading', () => {
    const { result } = renderSetup({
      optionId: BITCOIN_OPTION_ID,
      blockchainName: 'Bitcoin' as BlockchainName,
      support: undefined,
    });

    expect(result.current.hasAccountSetup).toBe(true);
  });
});
