import React from 'react';

import { Box, useColorMode } from '@chakra-ui/react';
import type { Meta, StoryObj } from '@storybook/react';
import { screen, userEvent, within } from '@storybook/test';

import { Route } from '../../../../.storybook/mocks/react-router-dom.mock';
import {
  createTab,
  getAccounts,
  getCurrentAccount,
  isValidAddress,
  getAdaHandle,
  updateRecentSentToAddress,
} from '../../../api/extension/api.mock';
import { buildTx } from '../../../api/extension/wallet.mock';
import { minAdaRequired, valueToAssets } from '../../../api/util.mock';
import { account, account1, currentAccount } from '../../../mocks/account.mock';
import { store } from '../../../mocks/store.mock';
import { useStoreState, useStoreActions } from '../../store.mock';
import { Cardano } from '../../../../.storybook/mocks/cardano-sdk.mock';

import Send from './send';
import { of } from 'rxjs';
import { Wallet } from '@lace/cardano';

const txInfo = {
  minUtxo: '969750',
};

const address = {
  display:
    'addr_test1qznkfw45dhtkr6f60hgw6rktmza7ll7achyv2w7vsx2khhcvec23vqjpq7wzwfq78j44xkyy6rg6435skpst6ju0j4tqfcx0ze',
  result:
    'addr_test1qznkfw45dhtkr6f60hgw6rktmza7ll7achyv2w7vsx2khhcvec23vqjpq7wzwfq78j44xkyy6rg6435skpst6ju0j4tqfcx0ze',
};

const inMemoryWallet: Wallet.ObservableWallet = {
  protocolParameters$: of({
    coinsPerUtxoByte: '4310',
  }),
  assetInfo$: of(
    new Map([
      [
        '0b23996b05afb3a76cc802dcb1d854a2b3596b208bf775c162cec2d34e6f6e5371756172654e66743235',

        {
          assetId:
            '0b23996b05afb3a76cc802dcb1d854a2b3596b208bf775c162cec2d34e6f6e5371756172654e66743235',
          policyId: '0b23996b05afb3a76cc802dcb1d854a2b3596b208bf775c162cec2d3',
          name: 'NonSquareNft25',
          fingerprint: 'asset15tfh93yjsffr7v9fepepuq2w4scl58eeaszmx7',
          quantity: BigInt('100000000000'),
        },
      ],
      [
        '212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995f54657374546f6b656e',
        {
          assetId:
            '212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995f54657374546f6b656e',
          policyId: '212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995f',
          name: 'TestToken',
          fingerprint: 'asset16cee8gr79j5k4ag5v8wlk5ygg5fjyech5ugykj',
          quantity: BigInt('9'),
        },
      ],
      [
        '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198444149',
        {
          assetId:
            '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198444149',
          policyId: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198',
          name: 'DAI',
          fingerprint: 'asset1vdkz0fx34r9km5xf4l5jk3emyysfamw5xr3yc2',
          quantity: BigInt('9000000'),
        },
      ],
      [
        '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198446a6564',
        {
          assetId:
            '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198446a6564',
          policyId: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198',
          name: 'Djed',
          fingerprint: 'asset1spcamsngdptfa0nr2r48e8720ry4k8mt6me5e4',
          quantity: BigInt('10999999'),
        },
      ],
      [
        '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff19855534443',
        {
          assetId:
            '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff19855534443',
          policyId: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198',
          name: 'USDC',
          fingerprint: 'asset1qketn3dc3hq5eudhpfrfnet9f7uk3ffpkt3vn5',
          quantity: BigInt('4000000'),
        },
      ],
      [
        '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff19855534454',
        {
          assetId:
            '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff19855534454',
          policyId: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198',
          name: 'USDT',
          fingerprint: 'asset1tnlqa0d3qqjrpsx3h9vjq9e3x6yurq7w7pwl2d',
          quantity: BigInt('9000000'),
        },
      ],
      [
        '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff19869555344',
        {
          assetId:
            '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff19869555344',
          policyId: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198',
          name: 'iUSD',
          fingerprint: 'asset1z68cfhqv29phnmlcczdjc9p28j2jl9f5jx8kqa',
          quantity: BigInt('10999999'),
        },
      ],
      [
        'e517b38693b633f1bc0dd3eb69cb1ad0f0c198c67188405901ae63a3001bc28068616e646c65735f6e61747572652d6c616b65',
        {
          assetId:
            'e517b38693b633f1bc0dd3eb69cb1ad0f0c198c67188405901ae63a3001bc28068616e646c65735f6e61747572652d6c616b65',
          policyId: 'e517b38693b633f1bc0dd3eb69cb1ad0f0c198c67188405901ae63a3',
          name: '\u0000\u001Bhandles_nature-lake',
          fingerprint: 'asset1juxtmgjasyr58hp523sn4n24yk0feqga6wxfh9',
          quantity: BigInt('1'),
        },
      ],
      [
        'f6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e3744d494e',
        {
          assetId:
            'f6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e3744d494e',
          policyId: 'f6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e3',
          name: 'tMIN',
          fingerprint: 'asset1dcspl93vqst7k7fcz2vx4mu6jvq7hsrse7zlpv',
          quantity: BigInt('22471977'),
        },
      ],
      [
        'f6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e374484f534b59',
        {
          assetId:
            'f6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e374484f534b59',
          policyId: 'f6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e3',
          name: 'tHOSKY',
          fingerprint: 'asset15qks69wv4vk7clnhp4lq7x0rpk6vs0s6exw0ry',
          quantity: BigInt('101'),
        },
      ],
    ]),
  ),
  handles$: of(),
  balance: {
    utxo: {
      total$: of({
        coins: BigInt('12732198240'),
        assets: new Map([
          [
            '0b23996b05afb3a76cc802dcb1d854a2b3596b208bf775c162cec2d34e6f6e5371756172654e66743235',
            '100000000000',
          ],
          [
            '212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995f54657374546f6b656e',
            '9',
          ],
          [
            '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198444149',
            '9000000',
          ],
          [
            '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198446a6564',
            '10999999',
          ],
          [
            '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff19855534443',
            '4000000',
          ],
          [
            '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff19855534454',
            '9000000',
          ],
          [
            '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff19869555344',
            '10999999',
          ],
          [
            'e517b38693b633f1bc0dd3eb69cb1ad0f0c198c67188405901ae63a3001bc28068616e646c65735f6e61747572652d6c616b65',
            '1',
          ],
          [
            'f6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e3744d494e',
            '22471977',
          ],
          [
            'f6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e374484f534b59',
            '101',
          ],
        ]),
      }),
    },
    rewardAccounts: {
      rewards$: of(BigInt(0)),
    },
  },
};

const SendStory = ({
  colorMode,
}: Readonly<{ colorMode: 'dark' | 'light' }>): React.ReactElement => {
  const { setColorMode } = useColorMode();
  setColorMode(colorMode);

  return (
    <Box width="400" height="600">
      <Send
        currentChain={{ networkId: 0, networkMagic: 0 }}
        inMemoryWallet={inMemoryWallet as unknown as Wallet.ObservableWallet}
      />
    </Box>
  );
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

const meta: Meta<typeof SendStory> = {
  title: 'Send',
  component: SendStory,
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
      return await Promise.resolve([account, account1]);
    });
    getCurrentAccount.mockImplementation(async () => {
      return await Promise.resolve(currentAccount);
    });
    isValidAddress.mockImplementation(async () => {
      return await Promise.resolve(true);
    });
    useStoreState.mockImplementation((callback: any) => {
      return callback({
        ...store,
        globalModel: {
          sendStore: {
            ...store.globalModel.sendStore,
            txInfo,
          },
        },
      });
    });
    useStoreActions.mockImplementation(() => {
      return () => void 0;
    });
    getAdaHandle.mockImplementation(async () => {
      return () => void 0;
    });
    updateRecentSentToAddress.mockImplementation(async () => {
      return () => void 0;
    });
    minAdaRequired.mockImplementation(() => '969750');
    buildTx.mockImplementation(async () => {
      const tx = {
        inspect: () => ({ inputSelection: { fee: '' } }),
      };
      return await Promise.resolve(tx);
    });

    Route.mockImplementation(({ path, component: Component }) => {
      return <>{path === 'send' ? <Component /> : null}</>;
    });

    Cardano.Address.fromBech32.mockImplementation(() => ({
      asBase: () => ({
        getPaymentCredential: () => ({}),
      }),
    }));

    return () => {
      createTab.mockReset();
      getCurrentAccount.mockReset();
      isValidAddress.mockReset();
      useStoreState.mockReset();
      useStoreActions.mockReset();
      getAdaHandle.mockReset();
      updateRecentSentToAddress.mockReset();
      minAdaRequired.mockReset();
      valueToAssets.mockReset();
      buildTx.mockReset();
      Route.mockReset();
      Cardano.Address.fromBech32.mockReset();
    };
  },
};
type Story = StoryObj<typeof SendStory>;
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

export const RecentAddressLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Recent address popover', async () => {
      await userEvent.click(
        await canvas.findByPlaceholderText('Address or $handle'),
      );
    });
  },
  parameters: {
    colorMode: 'light',
  },
};
export const RecentAddressDark: Story = {
  ...RecentAddressLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const AddressSuccessLight: Story = {
  beforeEach: () => {
    useStoreState.mockImplementation((callback: any) => {
      return callback({
        ...store,
        globalModel: {
          sendStore: {
            ...store.globalModel.sendStore,
            txInfo,
            address,
          },
        },
      });
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const AddressSuccessDark: Story = {
  ...AddressSuccessLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const AmountErrorLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Ammount input with error', async () => {
      const amountInput = await canvas.findByPlaceholderText('0.000000');
      await userEvent.type(amountInput, '123123123123');
      await userEvent.click(amountInput.parentElement);
    });
  },
  beforeEach: () => {
    useStoreState.mockImplementation((callback: any) => {
      return callback({
        ...store,
        globalModel: {
          sendStore: {
            ...store.globalModel.sendStore,
            txInfo,
            address,
            fee: { error: 'Transaction not possible' },
          },
        },
      });
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const AmountErrorDark: Story = {
  ...AmountErrorLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const AssetsLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Assets popover', async () => {
      await userEvent.click(await canvas.findByText('+ Assets'));
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const AssetsDark: Story = {
  ...AssetsLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const AssetsEmptyLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Asset popover empty', async () => {
      await userEvent.click(await canvas.findByText('+ Assets'));
      await userEvent.type(
        await canvas.findByPlaceholderText('Search policy, asset, name'),
        'asd',
      );
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const AssetsEmptyDark: Story = {
  ...AssetsEmptyLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const AssetsSetQuantityLight: Story = {
  beforeEach: () => {
    useStoreState.mockImplementation((callback: any) => {
      return callback({
        ...store,
        globalModel: {
          sendStore: {
            ...store.globalModel.sendStore,
            txInfo,
            address,
            fee: { error: 'Asset quantity not set' },
            value: {
              ada: '23',
              assets: [
                {
                  unit: '212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995f54657374546f6b656e',
                  quantity: '9',
                  policy:
                    '212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995f',
                  name: 'TestToken',
                  fingerprint: 'asset16cee8gr79j5k4ag5v8wlk5ygg5fjyech5ugykj',
                  decimals: 0,
                },
                {
                  unit: '0b23996b05afb3a76cc802dcb1d854a2b3596b208bf775c162cec2d34e6f6e5371756172654e66743235',
                  quantity: '1',
                  policy:
                    '0b23996b05afb3a76cc802dcb1d854a2b3596b208bf775c162cec2d3',
                  name: 'NonSquareNft25',
                  fingerprint: 'asset15tfh93yjsffr7v9fepepuq2w4scl58eeaszmx7',
                  input: '1',
                  decimals: 0,
                  image:
                    'https://ipfs.blockfrost.dev/ipfs/QmPmYGX7Vob7X9BkfHQeHskTJQJzgd9oZupugVSLXBJYLV',
                },
              ],
              personalAda: '',
              minAda: '0',
            },
          },
        },
      });
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const AssetsSetQuantityDark: Story = {
  ...AssetsSetQuantityLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const AssetsWithQuantityLight: Story = {
  beforeEach: () => {
    useStoreState.mockImplementation((callback: any) => {
      return callback({
        ...store,
        globalModel: {
          sendStore: {
            ...store.globalModel.sendStore,
            message: '123',
            txInfo,
            tx: '84a5008282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e0582582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e00018382583900a764bab46dd761e93a7dd0ed0ecbd8bbefffddc5c8c53bcc81956bdf0cce15160241079c27241e3cab535884d0d1aac690b060bd4b8f9556821a015ef3c0a2581c0b23996b05afb3a76cc802dcb1d854a2b3596b208bf775c162cec2d3a14e4e6f6e5371756172654e6674323501581c212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995fa14954657374546f6b656e0282583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a821a0011b0dea1581c212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995fa14954657374546f6b656e0782583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a1a705dc0e2021a0002c24d031a03bd4756075820538b6e75ff24315983465942e5a21f63496e3e4506f362ac47c36f9ee1d33f19a0f5a11902a2a1636d73678163313233',
            address,
            fee: { fee: '180813' },
            value: {
              ada: '23',
              assets: [
                {
                  unit: '212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995f54657374546f6b656e',
                  quantity: '9',
                  policy:
                    '212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995f',
                  name: 'TestToken',
                  displayName: 'TestToken',
                  fingerprint: 'asset16cee8gr79j5k4ag5v8wlk5ygg5fjyech5ugykj',
                  input: '2',
                  decimals: 0,
                },
                {
                  unit: '0b23996b05afb3a76cc802dcb1d854a2b3596b208bf775c162cec2d34e6f6e5371756172654e66743235',
                  quantity: '1',
                  policy:
                    '0b23996b05afb3a76cc802dcb1d854a2b3596b208bf775c162cec2d3',
                  name: 'NonSquareNft25',
                  displayName: 'NonSquareNft25',
                  fingerprint: 'asset15tfh93yjsffr7v9fepepuq2w4scl58eeaszmx7',
                  input: '1',
                  decimals: 0,
                  image:
                    'https://ipfs.blockfrost.dev/ipfs/QmPmYGX7Vob7X9BkfHQeHskTJQJzgd9oZupugVSLXBJYLV',
                },
              ],
              personalAda: '',
              minAda: '0',
            },
          },
        },
      });
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const AssetsWithQuantityDark: Story = {
  ...AssetsWithQuantityLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const ConfirmTransactionLight: Story = {
  ...AssetsWithQuantityLight,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Confirm popover', async () => {
      await userEvent.click(await canvas.findByTestId('sendBtn'));
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const ConfirmTransactionDark: Story = {
  ...ConfirmTransactionLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const ConfirmTransactionSendingAssetsLight: Story = {
  ...ConfirmTransactionLight,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Confirm popover sending assets', async () => {
      await userEvent.click(await canvas.findByTestId('sendBtn'));
      await userEvent.click(await screen.findByTestId('assetsBtn'));
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const ConfirmTransactionSendingAssetsDark: Story = {
  ...ConfirmTransactionSendingAssetsLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const ConfirmTransactionSendingAssetsUncollapsedLight: Story = {
  ...ConfirmTransactionSendingAssetsLight,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Confirm popover sending assets', async () => {
      await userEvent.click(await canvas.findByTestId('sendBtn'));
      await userEvent.click(await screen.findByTestId('assetsBtn'));
      const assets = await screen.findAllByTestId('asset');
      [...assets].forEach(async asset => {
        await userEvent.click(asset);
      });
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const ConfirmTransactionSendingAssetsUncollapsedDark: Story = {
  ...ConfirmTransactionSendingAssetsUncollapsedLight,
  parameters: {
    colorMode: 'dark',
  },
};
