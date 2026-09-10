/**
 * @vitest-environment jsdom
 */
import { WalletType } from '@lace-contract/wallet-repo';
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAddAccount } from '../../../src/pages/AddAccount/useAddAccount';

import type { HwBlockchainSupport } from '@lace-contract/onboarding-v2';
import type { AnyWallet } from '@lace-contract/wallet-repo';
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

const NETWORK_ID = 'cardano-preview';

const keystoneSupport: HwBlockchainSupport[][] = [
  [
    {
      deviceOptionId: 'keystone',
      walletType: WalletType.HardwareKeystone,
      blockchainName: 'Cardano' as BlockchainName,
      maxAccountIndex: 24,
    },
  ] as HwBlockchainSupport[],
];

const trezorSupport: HwBlockchainSupport[][] = [
  [
    {
      deviceOptionId: 'trezor',
      walletType: WalletType.HardwareTrezor,
      blockchainName: 'Cardano' as BlockchainName,
    },
  ] as HwBlockchainSupport[],
];

const makeAccount = (accountIndex: number) => ({
  blockchainNetworkId: NETWORK_ID,
  blockchainSpecific: { accountIndex },
});

const makeWallet = (
  type: WalletType,
  accountIndices: number[] = [],
): AnyWallet =>
  ({
    id: 'wallet-1',
    type,
    accounts: accountIndices.map(makeAccount),
    metadata: { name: 'Test Wallet' },
  } as unknown as AnyWallet);

const renderAddAccount = ({
  wallet,
  support,
}: {
  wallet: AnyWallet;
  support: HwBlockchainSupport[][] | undefined;
}) => {
  mocks.useLaceSelector.mockImplementation((key: string) => {
    if (key === 'wallets.selectWalletById') return wallet;
    if (key === 'accountManagement.getIsLoading') return false;
    if (key === 'network.selectActiveNetworkId') return NETWORK_ID;
    if (key === 'wallets.selectAccountNamesByNetworkId') return [];
    return undefined;
  });
  mocks.useLoadModules.mockImplementation((key: string) =>
    key === 'addons.loadHwBlockchainSupport' ? support : [],
  );
  const props = {
    route: { params: { walletId: 'wallet-1' } },
  } as unknown as SheetScreenProps<SheetRoutes.AddAccount>;
  return renderHook(() => useAddAccount(props));
};

describe('useAddAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useDispatchLaceAction.mockImplementation(() => vi.fn());
  });

  it('caps the account index dropdown at the device max account index', () => {
    const { result } = renderAddAccount({
      wallet: makeWallet(WalletType.HardwareKeystone),
      support: keystoneSupport,
    });

    expect(result.current.accountIndexDropdownItems).toHaveLength(25);
    expect(result.current.accountIndexDropdownItems.at(-1)?.value).toBe(24);
  });

  it('falls back to the app-wide maximum when the device declares no limit', () => {
    const { result } = renderAddAccount({
      wallet: makeWallet(WalletType.HardwareTrezor),
      support: trezorSupport,
    });

    expect(result.current.accountIndexDropdownItems).toHaveLength(50);
  });

  it('reports no available indices when every capped index is used', () => {
    const { result } = renderAddAccount({
      wallet: makeWallet(
        WalletType.HardwareKeystone,
        Array.from({ length: 25 }, (_, index) => index),
      ),
      support: keystoneSupport,
    });

    expect(result.current.hasAvailableIndices).toBe(false);
    expect(result.current.primaryButton).toBeUndefined();
  });

  it('clamps a selected index above a device cap that loads late', () => {
    const wallet = makeWallet(WalletType.HardwareKeystone);
    const { result, rerender } = renderAddAccount({
      wallet,
      support: undefined,
    });

    act(() => {
      result.current.onAccountIndexChange(30);
    });
    expect(result.current.accountIndex).toBe(30);

    mocks.useLoadModules.mockImplementation((key: string) =>
      key === 'addons.loadHwBlockchainSupport' ? keystoneSupport : [],
    );
    rerender();

    expect(result.current.accountIndex).toBe(0);
  });
});
