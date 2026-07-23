/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRestoreWalletSelectBlockchainsSheet } from '../../../src/pages/RestoreWallet/useRestoreWalletSelectBlockchainsSheet';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';
import type { BlockchainName } from '@lace-lib/util-store';

const mocks = vi.hoisted(() => ({
  useLaceSelector: vi.fn(),
  useDispatchLaceAction: vi.fn(),
  useLoadModules: vi.fn(),
  useRestoreWalletSecrets: vi.fn(),
}));

vi.mock('../../../src/hooks', () => ({
  useLaceSelector: mocks.useLaceSelector,
  useDispatchLaceAction: mocks.useDispatchLaceAction,
  useLoadModules: mocks.useLoadModules,
  useRestoreWalletSecrets: mocks.useRestoreWalletSecrets,
}));

vi.mock('@lace-contract/account-management', () => ({
  clearRestoreWalletSecrets: vi.fn(),
}));

vi.mock('@lace-contract/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@lace-lib/navigation', () => ({
  navigationRef: {
    goBack: vi.fn(),
    getCurrentRoute: vi.fn(() => ({ name: 'RestoreWalletSelectBlockchains' })),
  },
  SheetRoutes: {},
}));

vi.mock('../../../src/pages/RestoreWallet/utils', () => ({
  ensureSelection: (_integrations: unknown, selected: BlockchainName[]) =>
    selected,
  getBlockchainIcon: () => 'wallet',
}));

const attemptCreateWallet = vi.fn();
const setRestoreWalletSelectedBlockchains = vi.fn();
const clearRestoreWalletFlow = vi.fn();

const renderRestore = () => {
  const navigation = { addListener: vi.fn(() => vi.fn()) };
  return renderHook(() =>
    useRestoreWalletSelectBlockchainsSheet({
      navigation,
    } as unknown as SheetScreenProps<SheetRoutes.RestoreWalletSelectBlockchains>),
  );
};

describe('useRestoreWalletSelectBlockchainsSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useLaceSelector.mockImplementation((key: string) => {
      if (key === 'accountManagement.getIsLoading') return false;
      if (key === 'accountManagement.getRestoreWalletFlow')
        return { selectedBlockchains: ['Cardano' as BlockchainName] };
      if (key === 'wallets.selectAll') return [];
      return undefined;
    });
    mocks.useDispatchLaceAction.mockImplementation((name: string) => {
      switch (name) {
        case 'accountManagement.attemptCreateWallet':
          return attemptCreateWallet;
        case 'accountManagement.setRestoreWalletSelectedBlockchains':
          return setRestoreWalletSelectedBlockchains;
        default:
          return clearRestoreWalletFlow;
      }
    });
    mocks.useLoadModules.mockReturnValue([
      { blockchainName: 'Cardano' as BlockchainName },
    ]);
    mocks.useRestoreWalletSecrets.mockReturnValue({
      recoveryPhrase: ['abandon', 'ability'],
    });
  });

  it('enables Confirm when a blockchain is selected and secrets are present', () => {
    const { result } = renderRestore();

    expect(result.current.isConfirmDisabled).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('disables the button and shows the spinner as soon as Confirm is pressed', () => {
    const { result } = renderRestore();

    act(() => {
      result.current.onConfirm();
    });

    expect(attemptCreateWallet).toHaveBeenCalledTimes(1);
    expect(result.current.isConfirmDisabled).toBe(true);
    expect(result.current.isLoading).toBe(true);
  });

  it('ignores a second Confirm press while a wallet is being created', () => {
    const { result } = renderRestore();

    act(() => {
      result.current.onConfirm();
    });
    act(() => {
      result.current.onConfirm();
    });

    expect(attemptCreateWallet).toHaveBeenCalledTimes(1);
  });
});
