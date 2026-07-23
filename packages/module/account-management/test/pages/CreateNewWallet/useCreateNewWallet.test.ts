/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreateNewWallet } from '../../../src/pages/CreateNewWallet/useCreateNewWallet';

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

vi.mock('@lace-contract/account-management', () => ({
  isDuplicateString: () => false,
}));

vi.mock('@lace-contract/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@lace-lib/navigation', () => ({
  NavigationControls: { closeSheet: vi.fn() },
}));

vi.mock('@lace-lib/ui-toolkit', () => ({
  Blockchains: { Cardano: () => null },
}));

const attemptCreateWallet = vi.fn();

const renderCreate = () => {
  const navigation = { addListener: vi.fn(() => vi.fn()) };
  return renderHook(() =>
    useCreateNewWallet({
      navigation,
    } as unknown as SheetScreenProps<SheetRoutes.CreateNewWallet>),
  );
};

const prepareValidForm = (result: {
  current: ReturnType<typeof useCreateNewWallet>;
}) => {
  act(() => {
    result.current.onNameChange('My Wallet');
  });
  act(() => {
    result.current.options[0].onToggle(true);
  });
};

describe('useCreateNewWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useLaceSelector.mockImplementation((key: string) => {
      if (key === 'accountManagement.getIsLoading') return false;
      if (key === 'wallets.selectAll') return [];
      return undefined;
    });
    mocks.useDispatchLaceAction.mockImplementation((name: string) =>
      name === 'accountManagement.attemptCreateWallet'
        ? attemptCreateWallet
        : vi.fn(),
    );
    mocks.useLoadModules.mockReturnValue([
      { blockchainName: 'Cardano' as BlockchainName },
    ]);
  });

  it('keeps Create disabled until a name is entered and a blockchain is selected', () => {
    const { result } = renderCreate();
    expect(result.current.isConfirmDisabled).toBe(true);

    prepareValidForm(result);

    expect(result.current.isConfirmDisabled).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('disables the button and shows the spinner as soon as Create is pressed', () => {
    const { result } = renderCreate();
    prepareValidForm(result);

    act(() => {
      result.current.onConfirm();
    });

    expect(attemptCreateWallet).toHaveBeenCalledTimes(1);
    expect(result.current.isConfirmDisabled).toBe(true);
    expect(result.current.isLoading).toBe(true);
  });

  it('ignores a second Create press while a wallet is being created', () => {
    const { result } = renderCreate();
    prepareValidForm(result);

    act(() => {
      result.current.onConfirm();
    });
    act(() => {
      result.current.onConfirm();
    });

    expect(attemptCreateWallet).toHaveBeenCalledTimes(1);
  });
});
