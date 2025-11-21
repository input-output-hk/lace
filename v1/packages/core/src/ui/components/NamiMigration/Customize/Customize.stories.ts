import type { Meta, StoryObj } from '@storybook/react';
import nami from './nami.mp4';
import lace from './lace.mp4';

import { Customize } from './Customize';

const meta: Meta<typeof Customize> = {
  title: 'Nami Migration/Customise your wallet',
  component: Customize,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof Customize>;

export const Overview: Story = {
  args: {
    videosURL: {
      lace,
      nami
    },
    onBack: (): void => void 0,
    onDone: (): void => void 0,
    onChange: (): void => void 0
  },
  parameters: {
    decorators: {
      layout: 'vertical'
    }
  }
};
