import type { Meta } from '@storybook/react';
import { ImportantInfoDialog } from './ImportantInfoDialog';

const meta: Meta<typeof ImportantInfoDialog> = {
  component: ImportantInfoDialog,
  parameters: {
    layout: 'centered',
  },
  title: 'Components /ImportantInfo',
};

export default meta;

export const Overview = (): JSX.Element => <ImportantInfoDialog open onBack={() => void 0} onNext={() => void 0} />;
