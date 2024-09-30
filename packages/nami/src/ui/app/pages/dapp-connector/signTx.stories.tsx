import React from 'react';

import { Box, useColorMode } from '@chakra-ui/react';
import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, waitForElementToBeRemoved, within } from '@storybook/test';

import {
  extractKeyOrScriptHash,
  getCurrentAccount,
  getFavoriteIcon,
} from '../../../../api/extension/api.mock';

import SignTx from './signTx';
import { currentAccount } from '../../../../mocks/account.mock';
import { useStoreState } from '../../../store.mock';
import { store } from '../../../../mocks/store.mock';
import { valueToAssets } from '../../../../api/util.mock';
import { getKeyHashes, getValue } from './signTxUtil.mock';

const SignTxStory = ({
  colorMode,
}: Readonly<{ colorMode: 'dark' | 'light' }>): React.ReactElement => {
  const { setColorMode } = useColorMode();
  setColorMode(colorMode);

  return (
    <Box width="400" height="572">
      <SignTx
        request={{
          origin: 'https://app.sundae.fi',
          data: {
            tx: 'b71054ebc4900dd2aea06826482a8ecdbe78f605ceb1175011a24cfa7c189710',
          },
        }}
        controller={{ returnData: () => {} }}
      />
    </Box>
  );
};

const customViewports = {
  popup: {
    name: 'Popup',
    styles: {
      width: '400px',
      height: '572px',
    },
  },
};

const meta: Meta<typeof SignTxStory> = {
  title: 'Dapp Connector/SignTx',
  component: SignTxStory,
  parameters: {
    viewport: {
      viewports: customViewports,
      defaultViewport: 'popup',
    },
    layout: 'centered',
  },
  beforeEach: () => {
    getCurrentAccount.mockImplementation(async () => {
      return await Promise.resolve(currentAccount);
    });
    getFavoriteIcon.mockImplementation(() => {
      return 'https://app.sundae.fi/static/images/favicon.png';
    });
    extractKeyOrScriptHash.mockImplementation(async () => {
      return Promise.resolve(currentAccount.paymentKeyHashBech32);
    });
    useStoreState.mockImplementation((callback: any) => {
      return callback(store);
    });
    valueToAssets.mockImplementationOnce(() => {
      return [
        {
          unit: 'lovelace',
          quantity: '12732198240',
        },
      ] as any;
    });
    valueToAssets.mockImplementationOnce(() => {
      return [
        {
          unit: 'lovelace',
          quantity: '22732198240',
        },
      ] as any;
    });
    getValue.mockResolvedValue({
      ownValue: [
        {
          unit: 'lovelace',
          quantity: BigInt(22732198240),
        },
      ],
      externalValue: {
        [currentAccount.paymentKeyHashBech32]: {
          value: [
            {
              unit: 'lovelace',
              quantity: '22732198240',
            },
          ],
        },
      },
    });
    getKeyHashes.mockResolvedValue({ key: [], kind: ['payment'] });
    window.chrome = {
      runtime: {
        id: 'mock',
      },
    };
    return () => {
      getCurrentAccount.mockReset();
      getFavoriteIcon.mockReset();
      extractKeyOrScriptHash.mockReset();
      valueToAssets.mockReset();
      getValue.mockReset();
      getKeyHashes.mockReset();
      useStoreState.mockReset();
    };
  },
};
type Story = StoryObj<typeof SignTxStory>;

export default meta;

export const Light: Story = {
  parameters: {
    colorMode: 'light',
  },
};
export const Dark: Story = {
  parameters: {
    colorMode: 'dark',
  },
};

export const DetailsLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Wait for loading', async () => {
      await waitForElementToBeRemoved(() => canvas.queryByText('Loading...'));
    });
    await step('Click details', async () => {
      await userEvent.click(canvas.getByText('Details'));
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const DetailsDark: Story = {
  ...DetailsLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const DetailsContractLight: Story = {
  ...DetailsLight,
  beforeEach: () => {
    getValue.mockResolvedValue({
      ownValue: [
        {
          unit: 'lovelace',
          quantity: BigInt(22732198240),
        },
      ],
      externalValue: {
        [currentAccount.paymentKeyHashBech32]: {
          script: true,
          datumHash: 'datum',
          value: [
            {
              unit: 'lovelace',
              quantity: '22732198240',
            },
          ],
        },
      },
    });

    return () => {
      getValue.mockReset();
    };
  },
  parameters: {
    colorMode: 'dark',
  },
};

export const DetailsContractDark: Story = {
  ...DetailsContractLight,
  parameters: {
    colorMode: 'dark',
  },
};
