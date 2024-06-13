/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable functional/immutable-data */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import React from 'react';

import { Box, useColorMode } from '@chakra-ui/react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn, userEvent, within } from '@storybook/test';
import { http, HttpResponse } from 'msw';

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
} from '../../../api/extension/api.mock';
import {
  initTx,
  undelegateTx,
  withdrawalTx,
} from '../../../api/extension/wallet.mock';
import {
  account,
  account1,
  accountHW,
  currentAccount,
} from '../../../mocks/account.mock';
import { transactions } from '../../../mocks/history.mock';
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

const WalletStory = ({
  colorMode,
}: Readonly<{ colorMode: 'dark' | 'light' }>): React.ReactElement => {
  const { setColorMode } = useColorMode();
  setColorMode(colorMode);

  return (
    <Box width="400" height="600">
      <Wallet />
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
    msw: {
      handlers: [
        http.get('https://api.coingecko.com/api/v3/simple/price', () => {
          return HttpResponse.json(coingecoResponse);
        }),
      ],
    },
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
