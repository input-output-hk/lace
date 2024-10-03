/* eslint-disable functional/immutable-data */
import React from 'react';

import { useColorMode } from '@chakra-ui/react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn, userEvent, within } from '@storybook/test';

import {
  createHWAccounts,
  getHwAccounts,
} from '../../../api/extension/api.mock';
import { useOutsideHandles } from '../../../features/outside-handles-provider/useOutsideHandles.mock';

import { HWConnectFlow } from './hw';
import { SuccessAndClose } from './success-and-close';

const HWConnectStory = ({
  colorMode,
  Component,
}: Readonly<{
  colorMode: 'dark' | 'light';
  Component: React.FC<{ colorMode: 'dark' | 'light' }>;
}>): React.ReactElement => {
  const { setColorMode } = useColorMode();
  setColorMode(colorMode);

  return Component ? <Component colorMode={colorMode} /> : <HWConnectFlow />;
};

const HWSuccessStory = ({
  colorMode,
}: Readonly<{
  colorMode: 'dark' | 'light';
}>): React.ReactElement => {
  const { setColorMode } = useColorMode();
  setColorMode(colorMode);

  return <SuccessAndClose />;
};

declare global {
  interface Window {
    chrome: {
      runtime: {
        getURL: (path: string) => string;
      };
    };
  }
}

const customViewports = {
  fullScreen: {
    name: 'Full Screen',
    styles: {
      width: '100vw',
      height: '100vh',
    },
  },
};

const meta: Meta<typeof HWConnectStory> = {
  title: 'Connect HW',
  component: HWConnectStory,
  argTypes: {
    colorMode: {
      control: {
        type: 'select',
        options: ['dark', 'light'],
      },
    },
  },
  parameters: {
    viewport: {
      viewports: customViewports,
      defaultViewport: 'Full Screen',
    },
  },
  beforeEach: () => {
    window.chrome = {
      runtime: {
        getURL: (): string => {
          return `Trezor/popup.html`;
        },
      },
    };
    navigator.usb.requestDevice = fn(() => {
      return {
        deviceClass: 0,
        deviceProtocol: 0,
        deviceSubclass: 0,
        deviceVersionMajor: 2,
        deviceVersionMinor: 0,
        deviceVersionSubminor: 1,
        manufacturerName: 'Ledger',
        opened: false,
        productId: 16_405,
        productName: 'Nano X',
        serialNumber: '0001',
        usbVersionMajor: 2,
        usbVersionMinor: 1,
        usbVersionSubminor: 0,
        vendorId: 11_415,
      };
    });

    useOutsideHandles.mockImplementation(() => {
      return {
        connectHW: () => true,
      };
    });

    return () => {
      getHwAccounts.mockClear();
      createHWAccounts.mockClear();
      useOutsideHandles.mockClear();
    };
  },
};

type Story = StoryObj<typeof HWConnectStory>;
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

export const SelectDeviceLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('Select device', async () => {
      const ledgerButton = await canvas.findByTestId('ledger');
      await userEvent.click(ledgerButton);
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const SelectDeviceDark: Story = {
  ...SelectDeviceLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const SelectAccountLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('Select account', async () => {
      const ledgerButton = await canvas.findByTestId('ledger');
      await userEvent.click(ledgerButton);

      const connectButton = await canvas.findByText('Continue');
      await userEvent.click(connectButton);
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const SelectAccountDark: Story = {
  ...SelectAccountLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const SuccessAndCloseLight: Story = {
  parameters: {
    Component: HWSuccessStory,
    colorMode: 'light',
  },
};

export const SuccessAndCloseDark: Story = {
  ...SuccessAndCloseLight,
  parameters: {
    Component: HWSuccessStory,
    colorMode: 'dark',
  },
};
