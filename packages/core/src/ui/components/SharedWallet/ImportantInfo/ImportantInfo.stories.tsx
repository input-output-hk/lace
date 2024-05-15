import React from 'react';
import type { Meta } from '@storybook/react';

import { ImportantInfo } from './ImportantInfo';

const meta: Meta<typeof ImportantInfo> = {
  title: 'Shared Wallets/ImportantInfo',
  component: ImportantInfo,
  parameters: {
    layout: 'centered'
  }
};

export default meta;

export const Overview = (): JSX.Element => (
  <ImportantInfo
    translations={{
      title: 'Important information about shared wallets',
      subtitle:
        'Once you create your shared wallet, information contained will be fixed. You will not be able to edit after proceeding',
      checkBoxLabel: 'I understand that I will not be able to make changes after creating the shared wallet',
      backButton: 'Back',
      nextButton: 'Next'
    }}
    onBack={() => void 0}
    onNext={() => void 0}
  />
);
