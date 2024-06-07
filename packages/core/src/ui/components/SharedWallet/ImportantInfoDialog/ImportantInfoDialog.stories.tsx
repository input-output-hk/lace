import React from 'react';
import type { Meta } from '@storybook/react';

import { ImportantInfoDialog } from './ImportantInfoDialog';

const meta: Meta<typeof ImportantInfoDialog> = {
  title: 'Shared Wallets/ImportantInfo',
  component: ImportantInfoDialog,
  parameters: {
    layout: 'centered'
  }
};

export default meta;

export const Overview = (): JSX.Element => <ImportantInfoDialog open onBack={() => void 0} onNext={() => void 0} />;
