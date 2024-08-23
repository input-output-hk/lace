import React from 'react';

import { Box, useColorMode } from '@chakra-ui/react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  expect,
  fn,
  screen,
  userEvent,
  waitFor,
  within,
} from '@storybook/test';

import {
  createTab,
  getAccounts,
  getNativeAccounts,
  onAccountChange,
  updateAccount,
  switchAccount,
  getCurrentAccountIndex,
  getCurrentAccount,
  getDelegation,
  getNetwork,
  getTransactions,
  getAsset,
  updateTxInfo,
} from '../../../api/extension/api.mock';
import {
  buildTx,
  initTx,
  undelegateTx,
  withdrawalTx,
} from '../../../api/extension/wallet.mock';
import {
  account,
  account1,
  account2,
  accountHW,
  currentAccount,
} from '../../../mocks/account.mock';
import { transactions, transactions2 } from '../../../mocks/history.mock';
import { network } from '../../../mocks/network.mock';
import { store } from '../../../mocks/store.mock';
import { tokens } from '../../../mocks/token.mock';
import {
  currentlyDelegating,
  protocolParameters,
} from '../../../mocks/transaction.mock';
import { useStoreState, useStoreActions } from '../../store.mock';

import Wallet from './wallet';
import { useHistory } from '../../../../.storybook/mocks/react-router-dom.mock';
import { CurrencyCode } from '../../../adapters/currency';

const noop = (async () => {}) as any;

const cardanoCoin = {
  id: '1',
  name: 'Cardano',
  decimals: 6,
  symbol: 't₳',
};

const WalletStory = ({
  colorMode,
  hasCollateral,
}: Readonly<{
  colorMode: 'dark' | 'light';
  hasCollateral: boolean;
}>): React.ReactElement => {
  const { setColorMode } = useColorMode();
  setColorMode(colorMode);

  return (
    <Box overflowX="hidden">
      <Wallet
        cardanoCoin={cardanoCoin}
        walletAddress={account.paymentAddr}
        collateralFee={BigInt(0)}
        hasCollateral={hasCollateral}
        isInitializingCollateral={false}
        initializeCollateral={noop}
        reclaimCollateral={noop}
        submitCollateral={noop}
        currency={CurrencyCode.USD}
        accountName={currentAccount.name}
        accountAvatar={currentAccount.avatar}
        balance={BigInt(currentAccount.lovelace)}
        fiatPrice={coingecoResponse.cardano.usd}
        lockedCoins={BigInt(currentAccount.minAda)}
        unspendableCoins={BigInt(account.collateral.lovelace)}
      />
    </Box>
  );
};

const coingecoResponse = {
  cardano: {
    usd: 0.444_945,
    eur: 0.413_961,
  },
};

const customViewports = {
  popup: {
    name: 'Popup',
    styles: {
      width: '400px',
      height: '600px',
    },
  },
};

const meta: Meta<typeof WalletStory> = {
  title: 'Wallet',
  component: WalletStory,
  parameters: {
    viewport: {
      viewports: customViewports,
      defaultViewport: 'popup',
    },
    layout: 'centered',
  },
  beforeEach: () => {
    createTab.mockImplementation(async () => {
      await Promise.resolve();
    });
    getAccounts.mockImplementation(async () => {
      return await Promise.resolve([account]);
    });
    getNativeAccounts.mockImplementation(() => {
      return {};
    });
    onAccountChange.mockImplementation(() => {
      return {
        // @ts-ignore
        remove: () => void 0,
      };
    });
    updateAccount.mockImplementation(async () => {
      await Promise.resolve();
    });
    switchAccount.mockImplementation(async (index: number) => {
      await Promise.resolve(index);
      return true;
    });
    getCurrentAccountIndex.mockImplementation(async () => {
      return await Promise.resolve(0);
    });
    getDelegation.mockImplementation(async () => {
      return await Promise.resolve({});
    });
    getCurrentAccount.mockImplementation(async () => {
      return await Promise.resolve(currentAccount);
    });
    getNetwork.mockImplementation(async () => {
      return await Promise.resolve(network);
    });
    getTransactions.mockImplementation(async () => {
      return await Promise.resolve(transactions);
    });
    useStoreState.mockImplementation((callback: any) => {
      return callback(store);
    });
    useStoreActions.mockImplementation(() => {
      // @ts-ignore
      return () => void 0;
    });
    getAsset.mockImplementation(async (unit: keyof typeof tokens) => {
      return await Promise.resolve(tokens[unit]);
    });
    useHistory.mockImplementation(
      () =>
        ({
          push: () => {},
        }) as any,
    );

    const originalSetInterval = window.setInterval;

    (window.setInterval as unknown as any) = fn();

    process.env.npm_package_version = '0.1.0';

    // 👇 Reset the Date after each story
    return () => {
      createTab.mockReset();
      getAccounts.mockReset();
      getNativeAccounts.mockReset();
      onAccountChange.mockReset();
      updateAccount.mockReset();
      switchAccount.mockReset();
      getCurrentAccountIndex.mockReset();
      getDelegation.mockReset();
      getCurrentAccount.mockReset();
      getNetwork.mockReset();
      getTransactions.mockReset();
      useStoreState.mockReset();
      useStoreActions.mockReset();
      getAsset.mockReset();
      useHistory.mockReset();
      window.setInterval = originalSetInterval;
    };
  },
};
type Story = StoryObj<typeof WalletStory>;
export default meta;

export const LayoutLight: Story = {
  parameters: {
    colorMode: 'light',
  },
};
export const LayoutDark: Story = {
  parameters: {
    colorMode: 'dark',
  },
};

export const ReceiveLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Receive popover', async () => {
      await userEvent.click(canvas.getByText('Receive'));
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const ReceiveDark: Story = {
  ...ReceiveLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const AssetsSearchLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Asset search popover', async () => {
      await userEvent.click(canvas.getByTestId('searchIcon'));
      await userEvent.click(canvas.getByTestId('searchInput'));
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const AssetsSearchDark: Story = {
  ...AssetsSearchLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const WalletBalanceLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Wallet balance tooltip', async () => {
      await userEvent.hover(await canvas.findByTestId('balanceInfo'));
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const WalletBalanceDark: Story = {
  ...WalletBalanceLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const MenuLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Menu dropdown', async () => {
      const menu = await canvas.findByTestId('menu');
      await userEvent.click(menu.children[0]);
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const MenuDark: Story = {
  ...MenuLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const MenuWithTwoAccountsLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Menu dropdown', async () => {
      const menu = await canvas.findByTestId('menu');
      await userEvent.click(menu.children[0]);
    });
  },
  beforeEach: () => {
    getAccounts.mockImplementation(async () => {
      return await Promise.resolve([account, account1]);
    });
    getNativeAccounts.mockImplementation(() => {
      return [account, account1];
    });

    return () => {
      getAccounts.mockReset();
      getNativeAccounts.mockReset();
    };
  },
  parameters: {
    colorMode: 'light',
  },
};

export const MenuWithTwoAccountsDark: Story = {
  ...MenuWithTwoAccountsLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const MenuWithHWLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Menu dropdown', async () => {
      const menu = await canvas.findByTestId('menu');

      await userEvent.click(menu.children[0]);
    });
  },
  beforeEach: () => {
    getAccounts.mockImplementation(async () => {
      return await Promise.resolve([account, account1, accountHW]);
    });

    return () => {
      getAccounts.mockReset();
    };
  },
  parameters: {
    colorMode: 'light',
  },
};

export const MenuWithHWDark: Story = {
  ...MenuWithHWLight,
  parameters: {
    colorMode: 'dark',
  },
};

const sleep = async (ms = 1000): Promise<void> =>
  new Promise(resolve =>
    setTimeout(resolve, process.env.STORYBOOK_TEST ?? '' ? 0 : ms),
  );

export const AssetLight: Story = {
  play: async ({ canvasElement, step }) => {
    await sleep(300);
    const canvas = within(canvasElement);
    await step('Asset collapse', async () => {
      const assets = await canvas.findAllByTestId('asset');

      await userEvent.click(assets[1]);
    });
  },
  beforeEach: () => {
    getAccounts.mockImplementation(async () => {
      return await Promise.resolve([
        {
          ...account,
          preprod: {
            ...account.preprod,
            assets: account.preprod.assets.slice(0, 4),
          },
          assets: account.preprod.assets.slice(0, 4),
        },
      ]);
    });

    return () => {
      getAccounts.mockReset();
    };
  },
  parameters: {
    colorMode: 'light',
  },
};

export const AssetDark: Story = {
  ...AssetLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const CollectiblesLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('NFTs tab', async () => {
      const menu = await canvas.findByTestId('collectibles');
      await userEvent.click(menu.children[0]);
    });
  },
  beforeEach: () => {
    getAccounts.mockImplementation(async () => {
      return await Promise.resolve([
        {
          ...account,
          preprod: {
            ...account.preprod,
            assets: account.preprod.assets.slice(0, 4),
          },
          assets: account.preprod.assets.slice(0, 4),
        },
      ]);
    });

    return () => {
      getAccounts.mockReset();
    };
  },
  parameters: {
    colorMode: 'light',
  },
};

export const CollectiblesDark: Story = {
  ...CollectiblesLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const CollectiblesEmptyListLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('NFTs tab', async () => {
      const menu = await canvas.findByTestId('collectibles');
      await userEvent.click(menu.children[0]);
    });
  },
  beforeEach: () => {
    getAccounts.mockImplementation(async () => {
      return await Promise.resolve([
        {
          ...account,
          preprod: {
            ...account.preprod,
            assets: [],
          },
          assets: [],
        },
      ]);
    });

    return () => {
      getAccounts.mockReset();
    };
  },
  parameters: {
    colorMode: 'light',
  },
};

export const CollectiblesEmptyListDark: Story = {
  ...CollectiblesEmptyListLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const CollectibleMetadataLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('NFTs tab', async () => {
      const menu = await canvas.findByTestId('collectibles');
      await userEvent.click(menu.children[0]);

      const nft = await canvas.findByTestId('collectible-0');
      await userEvent.click(nft.children[0]);
    });
  },
  beforeEach: () => {
    getAccounts.mockImplementation(async () => {
      return await Promise.resolve([
        {
          ...account,
          preprod: {
            ...account.preprod,
            assets: account.preprod.assets.slice(0, 4),
          },
          assets: account.preprod.assets.slice(0, 4),
        },
      ]);
    });

    return () => {
      getAccounts.mockReset();
    };
  },
  parameters: {
    colorMode: 'light',
  },
};

export const CollectibleMetadataDark: Story = {
  ...CollectibleMetadataLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const StakePoolDelegationLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Delegation', async () => {
      const delegate = await canvas.findByText('Delegate');

      await userEvent.click(delegate);
    });
  },
  beforeEach: () => {
    initTx.mockImplementation(async () => {
      return await Promise.resolve(protocolParameters);
    });

    return () => {
      initTx.mockReset();
    };
  },
  parameters: {
    colorMode: 'light',
  },
};

export const StakePoolDelegationDark: Story = {
  ...StakePoolDelegationLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const StakePoolDelegatingLight: Story = {
  beforeEach: () => {
    getDelegation.mockImplementation(async () => {
      return await Promise.resolve(currentlyDelegating);
    });

    return () => {
      getDelegation.mockReset();
    };
  },
  parameters: {
    colorMode: 'light',
  },
};

export const StakePoolDelegatingDark: Story = {
  ...StakePoolDelegatingLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const StakePoolDeregistrationLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Deregistration popover', async () => {
      const delegating = await canvas.findByTestId('delegating');
      await userEvent.click(delegating);
      await sleep(300);
      await userEvent.click(await canvas.findByText('Unstake'));
    });
  },
  beforeEach: () => {
    getDelegation.mockImplementation(async () => {
      return await Promise.resolve(currentlyDelegating);
    });
    undelegateTx.mockImplementation(async () => {
      const tx = {
        body: () => ({
          fee: () => ({
            to_str: () => '176281',
          }),
        }),
      };
      return await Promise.resolve(tx);
    });

    return () => {
      getDelegation.mockReset();
      undelegateTx.mockReset();
    };
  },
  parameters: {
    colorMode: 'light',
  },
};

export const StakePoolDeregistrationDark: Story = {
  ...StakePoolDeregistrationLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const StakePoolWithdrawalLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Withdrawal popover', async () => {
      const delegating = await canvas.findByTestId('delegating');
      await userEvent.click(delegating);
      await sleep(300);
      await userEvent.click(await canvas.findByText('Withdraw'));
    });
  },
  beforeEach: () => {
    getDelegation.mockImplementation(async () => {
      return await Promise.resolve(currentlyDelegating);
    });
    withdrawalTx.mockImplementation(async () => {
      const tx = {
        body: () => ({
          fee: () => ({
            to_str: () => '176281',
          }),
        }),
      };
      return await Promise.resolve(tx);
    });

    return () => {
      getDelegation.mockReset();
      withdrawalTx.mockReset();
    };
  },
  parameters: {
    colorMode: 'light',
  },
};

export const StakePoolWithdrawalDark: Story = {
  ...StakePoolWithdrawalLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const StakePoolStakingInfoLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Withdrawal popover', async () => {
      const delegating = await canvas.findByTestId('delegating');
      await userEvent.click(delegating);
    });
  },
  beforeEach: () => {
    getDelegation.mockImplementation(async () => {
      return await Promise.resolve(currentlyDelegating);
    });

    return () => {
      getDelegation.mockReset();
    };
  },
  parameters: {
    colorMode: 'light',
  },
};

export const StakePoolStakingInfoDark: Story = {
  ...StakePoolStakingInfoLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const AddAccountLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Menu dropdown', async () => {
      const menu = await canvas.findByTestId('menu');
      await userEvent.click(menu.children[0]);
    });
    await step('Open new account modal', async () => {
      const button = await canvas.findByText('New Account');
      await userEvent.click(button.parentElement!);
    });
  },
  beforeEach: () => {
    getAccounts.mockImplementation(async () => {
      return await Promise.resolve([account]);
    });
    getNativeAccounts.mockImplementation(() => {
      return [account];
    });
    return () => {
      getAccounts.mockReset();
      getNativeAccounts.mockReset();
    };
  },
  parameters: {
    colorMode: 'light',
  },
};

export const AddAccountDark: Story = {
  ...AddAccountLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const DeleteAccountLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Menu dropdown', async () => {
      const menu = await canvas.findByTestId('menu');
      await userEvent.click(menu.children[0]);
    });
    await step('Open delete account modal', async () => {
      const button = await canvas.findByText('Delete Account');
      await userEvent.click(button.parentElement!);
    });
  },
  beforeEach: () => {
    getAccounts.mockImplementation(async () => {
      return await Promise.resolve([account1, account]);
    });
    getNativeAccounts.mockImplementation(() => {
      return [account1, account];
    });

    return () => {
      getAccounts.mockReset();
      getNativeAccounts.mockReset();
    };
  },
  parameters: {
    colorMode: 'light',
  },
};

export const DeleteAccountDark: Story = {
  ...DeleteAccountLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const RemoveCollateralLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Menu dropdown', async () => {
      const menu = await canvas.findByTestId('menu');
      await userEvent.click(menu.children[0]);
    });
    await step('Open collateral modal', async () => {
      const button = (await canvas.findByText('Collateral')).parentElement!;
      await waitFor(async () => expect(button).toBeEnabled());
      await userEvent.click(button);
    });
  },
  beforeEach: () => {
    getAccounts.mockImplementation(async () => {
      return await Promise.resolve([account]);
    });
    getNativeAccounts.mockImplementation(() => {
      return [account];
    });
    return () => {
      getAccounts.mockReset();
      getNativeAccounts.mockReset();
    };
  },
  parameters: {
    colorMode: 'light',
    hasCollateral: true,
  },
};

export const RemoveCollateralDark: Story = {
  ...RemoveCollateralLight,
  parameters: {
    colorMode: 'dark',
    hasCollateral: true,
  },
};

export const AddCollateralLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Menu dropdown', async () => {
      const menu = await canvas.findByTestId('menu');
      await userEvent.click(menu.children[0]);
    });
    await step('Open collateral modal', async () => {
      const button = (await canvas.findByText('Collateral')).parentElement!;
      await waitFor(async () => expect(button).toBeEnabled());
      await userEvent.click(button);
    });
  },
  beforeEach: () => {
    getAccounts.mockImplementation(async () => {
      return await Promise.resolve([{ ...account, collateral: undefined }]);
    });
    getNativeAccounts.mockImplementation(() => {
      return [{ ...account, collateral: undefined }];
    });
    buildTx.mockResolvedValue({
      body: () => ({
        fee: () => ({
          to_str: () => '176281',
        }),
      }),
    });
    return () => {
      getAccounts.mockReset();
      getNativeAccounts.mockReset();
      buildTx.mockReset();
    };
  },
  parameters: {
    colorMode: 'light',
    collateralFee: BigInt(176281),
  },
};

export const AddCollateralDark: Story = {
  ...AddCollateralLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const AboutModalLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Menu dropdown', async () => {
      const menu = await canvas.findByTestId('menu');
      await userEvent.click(menu.children[0]);
    });
    await step('Open about modal', async () => {
      const button = await canvas.findByText('About');
      await userEvent.click(button);
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const AboutModalDark: Story = {
  ...AboutModalLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const PrivacyPolicyModalLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Menu dropdown', async () => {
      const menu = await canvas.findByTestId('menu');
      await userEvent.click(menu.children[0]);
    });
    await step('Open about modal', async () => {
      const button = await canvas.findByText('About');
      await userEvent.click(button);
    });
    await step('Open privacy policy modal', async () => {
      await waitFor(() => {
        expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
      });
      const link = await screen.findByText('Privacy Policy');
      await userEvent.click(link);
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const PrivacyPolicyModalDark: Story = {
  ...PrivacyPolicyModalLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const TermsOfUseModalLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Menu dropdown', async () => {
      const menu = await canvas.findByTestId('menu');
      await userEvent.click(menu.children[0]);
    });
    await step('Open about modal', async () => {
      const button = await canvas.findByText('About');
      await userEvent.click(button);
    });
    await step('Open terms of use modal', async () => {
      await waitFor(() => {
        expect(screen.getByText('Terms of use')).toBeInTheDocument();
      });
      const link = await screen.findByText('Terms of use');
      await userEvent.click(link);
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const TermsOfUseModalDark: Story = {
  ...TermsOfUseModalLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const EmptyAssetListLight: Story = {
  beforeEach: () => {
    getAccounts.mockImplementation(async () => {
      return await Promise.resolve([
        {
          ...account,
          collateral: undefined,
          assets: [],
          lovelace: '0',
          minAda: 0,
        },
      ]);
    });
    getNativeAccounts.mockImplementation(() => {
      return [account];
    });
    return () => {
      getAccounts.mockReset();
      getNativeAccounts.mockReset();
    };
  },
  parameters: {
    colorMode: 'light',
  },
};

export const EmptyAssetListDark: Story = {
  ...EmptyAssetListLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const EmptyHistoryListLight: Story = {
  beforeEach: () => {
    getAccounts.mockImplementation(async () => {
      return await Promise.resolve([
        {
          ...account,
          history: {
            confirmed: [],
          },
        },
      ]);
    });
    getTransactions.mockImplementation(async () => {
      return await Promise.resolve([]);
    });
    return () => {
      getAccounts.mockReset();
      getTransactions.mockReset();
    };
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Switch to history tab', async () => {
      await userEvent.click(canvas.getByTestId('clockIcon'));
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const EmptyHistoryListDark: Story = {
  ...EmptyHistoryListLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const HistoryLight: Story = {
  beforeEach: () => {
    updateTxInfo.mockImplementation(txHash => {
      return account.history.details[txHash];
    });
    getAccounts.mockImplementation(async () => {
      return await Promise.resolve([account2]);
    });
    getTransactions.mockImplementation(async () => {
      return await Promise.resolve(transactions2);
    });
    return () => {
      updateTxInfo.mockReset();
      getAccounts.mockReset();
      getTransactions.mockReset();
    };
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Open transaction history', async () => {
      await userEvent.click(canvas.getByTestId('clockIcon'));
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const HistoryDark: Story = {
  ...HistoryLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const HistoryTxLight: Story = {
  beforeEach: () => {
    updateTxInfo.mockImplementation(txHash => {
      return account.history.details[txHash];
    });
    getAccounts.mockImplementation(async () => {
      return await Promise.resolve([account2]);
    });
    getTransactions.mockImplementation(async () => {
      return await Promise.resolve(transactions2);
    });
    return () => {
      updateTxInfo.mockReset();
      getAccounts.mockReset();
      getTransactions.mockReset();
    };
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Open transaction history', async () => {
      await userEvent.click(canvas.getByTestId('clockIcon'));
    });
    await step('Open first transaction', async () => {
      const button = await canvas.findByTestId(
        `transaction-button-${account2.history.confirmed[0]}`,
      );
      await userEvent.click(button);
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const HistoryTxDark: Story = {
  ...HistoryTxLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const HistoryTxAssetsLight: Story = {
  beforeEach: () => {
    updateTxInfo.mockImplementation(txHash => {
      return account.history.details[txHash];
    });
    getAccounts.mockImplementation(async () => {
      return await Promise.resolve([account2]);
    });
    getTransactions.mockImplementation(async () => {
      return await Promise.resolve(transactions2);
    });
    return () => {
      updateTxInfo.mockReset();
      getAccounts.mockReset();
      getTransactions.mockReset();
    };
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Open transaction history', async () => {
      await userEvent.click(canvas.getByTestId('clockIcon'));
    });
    await step('Open transaction assets popover', async () => {
      const button = await canvas.findByTestId('asset-popover-trigger');
      await userEvent.click(button);
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const HistoryTxAssetsDark: Story = {
  ...HistoryTxAssetsLight,
  parameters: {
    colorMode: 'dark',
  },
};
