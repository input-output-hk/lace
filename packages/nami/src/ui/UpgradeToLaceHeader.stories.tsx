import React from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { store } from '../mocks/store.mock';

import { useStoreActions, useStoreState } from './store.mock';
import { UpgradeToLaceHeader } from './UpgradeToLaceHeader';

const customViewports = {
  popup: {
    name: 'Popup',
    styles: {
      width: '400px',
      height: '600px',
    },
  },
};

const meta: Meta<typeof UpgradeToLaceHeader> = {
  title: 'UpgradeHeader',
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  component: () => <UpgradeToLaceHeader switchWalletMode={async () => {}} />,
  parameters: {
    viewport: {
      viewports: customViewports,
      defaultViewport: 'popup',
    },
    layout: 'centered',
  },
  beforeEach: () => {
    useStoreState.mockImplementation((callback: any) => {
      return callback({
        ...store,
        globalModel: {
          ...store.globalModel,
          laceSwitchStore: { isLaceSwitchInProgress: true },
        },
      });
    });
    useStoreActions.mockImplementation(() => {
      return () => void 0;
    });
  },
};

export default meta;
export const Light: StoryObj = {
  parameters: {
    colorMode: 'light',
  },
};
