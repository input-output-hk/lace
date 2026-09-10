/**
 * @vitest-environment jsdom
 */
import { WalletType } from '@lace-contract/wallet-repo';
import { HardwareIntegrationId } from '@lace-lib/util-hw';
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAddWalletHardwareSetup } from '../../../src/pages/AddWalletHardwareSetup/useAddWalletHardwareSetup';

import type { HwBlockchainSupport } from '@lace-contract/onboarding-v2';
import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';
import type { BlockchainName } from '@lace-lib/util-store';

const mocks = vi.hoisted(() => ({
  useLaceSelector: vi.fn(),
  useDispatchLaceAction: vi.fn(),
  useLoadModules: vi.fn(),
}));

vi.mock('../../../src/hooks', () => ({
  useLaceSelector: mocks.useLaceSelector,
  useDispatchLaceAction: mocks.useDispatchLaceAction,
  useLoadModules: mocks.useLoadModules,
}));

vi.mock('@lace-contract/i18n', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@lace-lib/navigation', () => ({
  NavigationControls: { closeSheet: vi.fn() },
}));

const TREZOR_CARDANO_OPTION_ID = HardwareIntegrationId('trezor');
const TREZOR_BITCOIN_OPTION_ID = HardwareIntegrationId('trezor-bitcoin');
const KEYSTONE_BITCOIN_OPTION_ID = HardwareIntegrationId('keystone-bitcoin');

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

const attemptCreateHardwareWallet = vi.fn();
const clearAccountStatus = vi.fn();

const renderSetup = ({
  optionId,
  blockchainName,
  support,
}: {
  optionId: HardwareIntegrationId;
  blockchainName: BlockchainName;
  support: HwBlockchainSupport[][] | undefined;
}) => {
  mocks.useLoadModules.mockReturnValue(support);
  const route = {
    params: {
      optionId,
      derivationTypes: ['ICARUS'],
      blockchainName,
    },
  };
  return renderHook(() =>
    useAddWalletHardwareSetup({
      route,
    } as unknown as SheetScreenProps<SheetRoutes.AddWalletHardwareSetup>),
  );
};

describe('useAddWalletHardwareSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useLaceSelector.mockImplementation((key: string) => {
      if (key === 'accountManagement.getIsLoading') return false;
      if (key === 'accountManagement.getLastHardwareWalletCreationError')
        return null;
      return undefined;
    });
    mocks.useDispatchLaceAction.mockImplementation((name: string) =>
      name === 'accountManagement.attemptCreateHardwareWallet'
        ? attemptCreateHardwareWallet
        : clearAccountStatus,
    );
  });

  it('surfaces derivation types for an app-driven Cardano setup', () => {
    const { result } = renderSetup({
      optionId: TREZOR_CARDANO_OPTION_ID,
      blockchainName: 'Cardano' as BlockchainName,
      support: trezorSupport,
    });

    expect(result.current.hasAccountSetup).toBe(true);
    expect(result.current.maxAccountIndex).toBeUndefined();
    expect(result.current.derivationTypeOptions).toEqual([
      expect.objectContaining({ value: 'ICARUS' }),
    ]);

    act(() => {
      result.current.onCreateWallet();
    });

    expect(attemptCreateHardwareWallet).toHaveBeenCalledWith(
      expect.objectContaining({
        optionId: TREZOR_CARDANO_OPTION_ID,
        accountIndex: 0,
        derivationType: 'ICARUS',
        blockchainName: 'Cardano',
      }),
    );
  });

  it('surfaces the device max account index for a capped Cardano setup', () => {
    const { result } = renderSetup({
      optionId: KEYSTONE_CARDANO_OPTION_ID,
      blockchainName: 'Cardano' as BlockchainName,
      support: keystoneSupport,
    });

    expect(result.current.hasAccountSetup).toBe(true);
    expect(result.current.maxAccountIndex).toBe(24);
  });

  it('hides the derivation type picker for an app-driven Bitcoin setup', () => {
    const { result } = renderSetup({
      optionId: TREZOR_BITCOIN_OPTION_ID,
      blockchainName: 'Bitcoin' as BlockchainName,
      support: trezorSupport,
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

  it('hides account setup for a device-account-selection Bitcoin setup', () => {
    const { result } = renderSetup({
      optionId: KEYSTONE_BITCOIN_OPTION_ID,
      blockchainName: 'Bitcoin' as BlockchainName,
      support: keystoneSupport,
    });

    expect(result.current.hasAccountSetup).toBe(false);
    expect(result.current.derivationTypeOptions).toBeUndefined();
    expect(result.current.instructionText).toBe(
      'v2.keystone-bitcoin.import.instruction',
    );

    act(() => {
      result.current.onCreateWallet();
    });

    expect(attemptCreateHardwareWallet).toHaveBeenCalledWith(
      expect.objectContaining({
        optionId: KEYSTONE_BITCOIN_OPTION_ID,
        accountIndex: 0,
        derivationType: undefined,
        blockchainName: 'Bitcoin',
      }),
    );
  });
});
