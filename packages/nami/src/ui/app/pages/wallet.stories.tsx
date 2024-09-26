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
} from '../../../api/extension/api.mock';
import {
  account,
  account1,
  account2,
  accountHW,
  currentAccount,
} from '../../../mocks/account.mock';
import { transactions } from '../../../mocks/history.mock';
import { network } from '../../../mocks/network.mock';
import { store } from '../../../mocks/store.mock';
import { tokens } from '../../../mocks/token.mock';
import { currentlyDelegating } from '../../../mocks/transaction.mock';
import { useStoreState, useStoreActions } from '../../store.mock';

import Wallet, { Props } from './wallet';
import { useHistory } from '../../../../.storybook/mocks/react-router-dom.mock';
import { CurrencyCode } from '../../../adapters/currency';
import { useDelegation } from '../../../adapters/delegation.mock';
import { Wallet as CardanoWallet } from '@lace/cardano';
import { useOutsideHandles } from '../../../features/outside-handles-provider/useOutsideHandles.mock';
import { useCollateral } from '../../../adapters/collateral.mock';

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
        setAvatar={() => void 0}
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
  beforeEach: () => {
    useDelegation.mockImplementation(() => {
      return {
        delegation: undefined,
        initDelegation: async (
          pool?: Readonly<CardanoWallet.Cardano.StakePool>,
        ) => {
          await pool;
        },
        stakeRegistration: '2000000',
      };
    });
    useOutsideHandles.mockImplementation(() => {
      return {
        passwordUtil: {},
        cardanoCoin,
        collateralFee: BigInt(0),
        isInitializingCollateral: false,
      };
    });
    useCollateral.mockImplementation(() => {
      return {
        reclaimCollateral: async () => {},
        submitCollateral: async () => {},
        hasCollateral: false,
      };
    });

    return () => {
      useDelegation.mockReset();
      useOutsideHandles.mockReset();
      useCollateral.mockReset();
    };
  },
  parameters: {
    colorMode: 'light',
  },
};

export const LayoutDark: Story = {
  ...LayoutLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const ReceiveLight: Story = {
  ...LayoutLight,
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
  ...LayoutLight,
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
  ...LayoutLight,
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
  ...LayoutLight,
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
  ...LayoutLight,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Menu dropdown', async () => {
      const menu = await canvas.findByTestId('menu');
      await userEvent.click(menu.children[0]);
    });
  },
  parameters: {
    colorMode: 'light',
    accounts: [
      {
        walletId: 'walletId1',
        index: 1,
        name: account.name,
        avatar: account.avatar,
        balance: BigInt(account.lovelace),
      },
      {
        walletId: 'walletId1',
        index: 2,
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
  ...LayoutLight,
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
        walletId: 'walletId1',
        index: 1,
        name: account.name,
        avatar: account.avatar,
        balance: BigInt(account.lovelace),
      },
      {
        walletId: 'hw1',
        index: 1,
        name: account1.name,
        avatar: account1.avatar,
        balance: BigInt(account1.lovelace),
      },
      {
        walletId: 'hw1',
        index: 2,
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
    ...MenuWithHWLight.parameters,
    colorMode: 'dark',
  },
};

const sleep = async (ms = 1000): Promise<void> =>
  new Promise(resolve =>
    setTimeout(resolve, process.env.STORYBOOK_TEST ?? '' ? 0 : ms),
  );

export const AssetLight: Story = {
  ...LayoutLight,
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
  ...LayoutLight,
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
  ...LayoutLight,
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
  ...LayoutLight,
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
  ...LayoutLight,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Delegation', async () => {
      const delegate = await canvas.findByText('Delegate');

      await userEvent.click(delegate);
    });
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
  ...LayoutLight,
  beforeEach: () => {
    useDelegation.mockImplementation(() => {
      return {
        delegation: currentlyDelegating,
        initDelegation: async (
          pool?: Readonly<CardanoWallet.Cardano.StakePool>,
        ) => {
          await pool;
        },
        stakeRegistration: '2000000',
      };
    });
    useOutsideHandles.mockImplementation(() => {
      return {
        passwordUtil: {},
        cardanoCoin,
        collateralFee: BigInt(0),
        isInitializingCollateral: false,
        delegationTxFee: BigInt(176281),
      };
    });
    useCollateral.mockImplementation(() => {
      return {
        reclaimCollateral: async () => {},
        submitCollateral: async () => {},
        hasCollateral: false,
      };
    });

    return () => {
      useDelegation.mockReset();
      useOutsideHandles.mockReset();
      useCollateral.mockReset();
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
  ...StakePoolDelegatingLight,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Deregistration popover', async () => {
      const delegating = await canvas.findByTestId('delegating');
      await userEvent.click(delegating);
      await sleep(300);
      await userEvent.click(await canvas.findByText('Unstake'));
    });
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
  ...StakePoolDelegatingLight,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Withdrawal popover', async () => {
      const delegating = await canvas.findByTestId('delegating');
      await userEvent.click(delegating);
      await sleep(300);
      await userEvent.hover(await canvas.findByTestId('withdrawInfo'));
    });
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
  ...StakePoolDelegatingLight,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Withdrawal popover', async () => {
      const delegating = await canvas.findByTestId('delegating');
      await userEvent.click(delegating);
    });
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
  ...LayoutLight,
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
  ...LayoutLight,
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
  parameters: {
    colorMode: 'light',
    activeAccount: {
      walletId: 1,
      index: 1,
      name: account1.name,
      avatar: account1.avatar,
    },
    accounts: [
      {
        walletId: 1,
        index: 1,
        name: account1.name,
        avatar: account1.avatar,
        balance: BigInt(0),
      },
      {
        walletId: 1,
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
  ...LayoutLight,
  beforeEach: () => {
    useDelegation.mockImplementation(() => {
      return {
        delegation: undefined,
        initDelegation: async (
          pool?: Readonly<CardanoWallet.Cardano.StakePool>,
        ) => {
          await pool;
        },
        stakeRegistration: '2000000',
      };
    });
    useOutsideHandles.mockImplementation(() => {
      return {
        passwordUtil: {},
        cardanoCoin,
        collateralFee: BigInt(0),
        isInitializingCollateral: false,
      };
    });
    useCollateral.mockImplementation(() => {
      return {
        reclaimCollateral: async () => {},
        submitCollateral: async () => {},
        hasCollateral: true,
      };
    });

    return () => {
      useDelegation.mockReset();
      useOutsideHandles.mockReset();
      useCollateral.mockReset();
    };
  },
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
  ...LayoutLight,
  beforeEach: () => {
    useDelegation.mockImplementation(() => {
      return {
        delegation: undefined,
        initDelegation: async (
          pool?: Readonly<CardanoWallet.Cardano.StakePool>,
        ) => {
          await pool;
        },
        stakeRegistration: '2000000',
      };
    });
    useOutsideHandles.mockImplementation(() => {
      return {
        passwordUtil: {},
        cardanoCoin,
        collateralFee: BigInt(176281),
        isInitializingCollateral: false,
        hasNoFunds: false,
        initializeCollateralTx: async () => {},
      };
    });
    useCollateral.mockImplementation(() => {
      return {
        reclaimCollateral: async () => {},
        submitCollateral: async () => {},
        hasCollateral: false,
      };
    });

    return () => {
      useDelegation.mockReset();
      useOutsideHandles.mockReset();
      useCollateral.mockReset();
    };
  },
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
  ...LayoutLight,
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
  ...LayoutLight,
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
  ...LayoutLight,
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
  ...LayoutLight,
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
  ...LayoutLight,
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
  ...LayoutLight,
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
  ...LayoutLight,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Open transaction history', async () => {
      await userEvent.click(canvas.getByTestId('clockIcon'));
    });
    // await step('Open first transaction', async () => {
    //   const button = await canvas.findByTestId(
    //     `transaction-button-${account2.history.confirmed[0]}`,
    //   );
    //   await userEvent.click(button);
    // });
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
  ...LayoutLight,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Open transaction history', async () => {
      await userEvent.click(canvas.getByTestId('clockIcon'));
    });
    // await step('Open transaction assets popover', async () => {
    //   const button = await canvas.findByTestId('asset-popover-trigger');
    //   await userEvent.click(button);
    // });
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
