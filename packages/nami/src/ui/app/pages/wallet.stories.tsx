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
  onAccountChange,
  updateAccount,
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

import Wallet, { Props } from './wallet';
import { useHistory } from '../../../../.storybook/mocks/react-router-dom.mock';
import { CurrencyCode } from '../../../adapters/currency';
import { Asset } from '../../../types/assets';

const noop = (async () => {}) as any;

const cardanoCoin = {
  id: '1',
  name: 'Cardano',
  decimals: 6,
  symbol: 't₳',
};

process.env.APP_VERSION = '0.1.0';

const WalletStory = ({
  colorMode,
  assets,
  nfts,
  ...props
}: Readonly<
  Partial<Props> & { colorMode: 'dark' | 'light' }
>): React.ReactElement => {
  const { setColorMode } = useColorMode();
  setColorMode(colorMode);

  return (
    <Box overflowX="hidden">
      <Wallet
        cardanoCoin={cardanoCoin}
        walletAddress={account.paymentAddr}
        collateralFee={BigInt(0)}
        hasCollateral={false}
        isInitializingCollateral={false}
        initializeCollateral={noop}
        reclaimCollateral={noop}
        submitCollateral={noop}
        accounts={[]}
        nextIndex={1}
        currency={CurrencyCode.USD}
        activeAccount={{
          index: 0,
          name: currentAccount.name,
          avatar: currentAccount.avatar,
        }}
        balance={BigInt(currentAccount.lovelace)}
        fiatPrice={coingecoResponse.cardano.usd}
        lockedCoins={BigInt(currentAccount.minAda)}
        unspendableCoins={BigInt(account.collateral.lovelace)}
        activateAccount={noop}
        addAccount={noop}
        removeAccount={noop}
        assets={assets ?? []}
        nfts={nfts ?? []}
        updateAccountMetadata={() => void 0}
        {...props}
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
    onAccountChange.mockImplementation(() => {
      return {
        // @ts-ignore
        remove: () => void 0,
      };
    });
    updateAccount.mockImplementation(async () => {
      await Promise.resolve();
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
      onAccountChange.mockReset();
      updateAccount.mockReset();
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
    activeAccount: { index: 0, name: account.name, avatar: account.avatar },
    accounts: [
      {
        index: 0,
        name: account.name,
        avatar: account.avatar,
        balance: BigInt(account.lovelace),
      },
    ],
  },
};

export const MenuDark: Story = {
  ...MenuLight,
  parameters: {
    ...MenuLight.parameters,
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

    return () => {
      getAccounts.mockReset();
    };
  },
  parameters: {
    colorMode: 'light',
    accounts: [
      {
        name: account.name,
        avatar: account.avatar,
        balance: BigInt(account.lovelace),
      },
      {
        name: account1.name,
        avatar: account1.avatar,
        balance: BigInt(account1.lovelace),
      },
    ],
  },
};

export const MenuWithTwoAccountsDark: Story = {
  ...MenuWithTwoAccountsLight,
  parameters: {
    ...MenuWithTwoAccountsLight.parameters,
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
    activeAccount: { index: 0, name: account.name, avatar: account.avatar },
    accounts: [
      {
        name: account.name,
        avatar: account.avatar,
        balance: BigInt(account.lovelace),
      },
      {
        name: account1.name,
        avatar: account1.avatar,
        balance: BigInt(account1.lovelace),
      },
      {
        name: accountHW.name,
        avatar: accountHW.avatar,
        balance: BigInt(0),
      },
    ],
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
  parameters: {
    colorMode: 'light',
    assets: [
      {
        unit: 'lovelace',
        quantity: (
          BigInt(currentAccount.lovelace) -
          BigInt(currentAccount.minAda) -
          BigInt(account.collateral.lovelace)
        ).toString(),
      },
      ...[
        '212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995f4d657368546f6b656e',
        '212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995f54657374546f6b656e',
      ]
        .map(id => tokens[id])
        .filter(id => id),
    ],
  },
};

export const AssetDark: Story = {
  ...AssetLight,
  parameters: {
    ...AssetLight.parameters,
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
  parameters: {
    colorMode: 'light',
    nfts: [
      ...[
        '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198444149',
        '0b23996b05afb3a76cc802dcb1d854a2b3596b208bf775c162cec2d34e6f6e5371756172654e66743235',
      ]
        .map(id => tokens[id])
        .filter(id => id),
    ],
  },
};

export const CollectiblesDark: Story = {
  ...CollectiblesLight,
  parameters: {
    ...CollectiblesLight.parameters,
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
  parameters: {
    ...CollectiblesLight.parameters,
    colorMode: 'light',
  },
};

export const CollectibleMetadataDark: Story = {
  ...CollectibleMetadataLight,
  parameters: {
    ...CollectibleMetadataLight.parameters,
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

    return () => {
      getAccounts.mockReset();
    };
  },
  parameters: {
    colorMode: 'light',
    accounts: [
      {
        name: account.name,
        avatar: account.avatar,
        balance: BigInt(account.lovelace),
      },
    ],
  },
};

export const AddAccountDark: Story = {
  ...AddAccountLight,
  parameters: {
    ...AddAccountLight.parameters,
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
    return () => {
      getAccounts.mockReset();
    };
  },
  parameters: {
    colorMode: 'light',
    activeAccount: { index: 1, name: account1.name, avatar: account1.avatar },
    accounts: [
      {
        index: 1,
        name: account1.name,
        avatar: account1.avatar,
        balance: BigInt(0),
      },
      {
        index: 0,
        name: account.name,
        avatar: account.avatar,
        balance: BigInt(account.lovelace),
      },
    ],
  },
};

export const DeleteAccountDark: Story = {
  ...DeleteAccountLight,
  parameters: {
    ...DeleteAccountLight.parameters,
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

    return () => {
      getAccounts.mockReset();
    };
  },
  parameters: {
    colorMode: 'light',
    hasCollateral: true,
    accounts: [
      {
        name: account.name,
        avatar: account.avatar,
        balance: BigInt(account.lovelace),
      },
    ],
  },
};

export const RemoveCollateralDark: Story = {
  ...RemoveCollateralLight,
  parameters: {
    ...RemoveCollateralLight.parameters,
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
    buildTx.mockResolvedValue({
      body: () => ({
        fee: () => ({
          to_str: () => '176281',
        }),
      }),
    });
    return () => {
      getAccounts.mockReset();
      buildTx.mockReset();
    };
  },
  parameters: {
    colorMode: 'light',
    collateralFee: BigInt(176281),
    accounts: [
      {
        name: account.name,
        avatar: account.avatar,
        balance: BigInt(account.lovelace),
      },
    ],
  },
};

export const AddCollateralDark: Story = {
  ...AddCollateralLight,
  parameters: {
    ...AddCollateralLight.parameters,
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
    return () => {
      getAccounts.mockReset();
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
