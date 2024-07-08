import { Meta } from '@storybook/react/*';
import { ReactElement } from 'react';
import { SharedWalletRestorationFlow } from './SharedWalletRestorationFlow';

const meta: Meta<typeof SharedWalletRestorationFlow> = {
  component: SharedWalletRestorationFlow,
  parameters: {
    layout: 'centered',
  },
  title: 'Components / Import Wallet',
};

export default meta;

const noop = (): void => void 0;

export const ImportWalletComponent = (): ReactElement => (
  <SharedWalletRestorationFlow navigateToAppHome={noop} navigateToStart={noop} />
);
