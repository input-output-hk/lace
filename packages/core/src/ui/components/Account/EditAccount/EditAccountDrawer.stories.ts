import type { Meta, StoryObj } from '@storybook/react';

import { EditAccountDrawer } from './EditAccountDrawer';
import { ComponentProps } from 'react';
import { ThemeColorScheme } from '@input-output-hk/lace-ui-toolkit';

const meta: Meta<typeof EditAccountDrawer> = {
  title: 'Accounts/EditAccountDrawer',
  component: EditAccountDrawer,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof EditAccountDrawer>;

const data: ComponentProps<typeof EditAccountDrawer> = {
  hide: () => void 0,
  index: 1,
  name: 'Account #1',
  onSave: () => void 0,
  visible: true,
  translations: {
    title: 'Edit account name',
    inputLabel: 'Account name',
    save: 'Save',
    cancel: 'Cancel'
  }
};

export const Overview: Story = {
  args: {
    ...data
  },
  parameters: {
    decorators: {
      colorSchema: false
    }
  }
};

export const WithDarkMode: Story = {
  args: {
    ...data
  },
  parameters: {
    decorators: {
      colorSchema: false,
      theme: ThemeColorScheme.Dark
    }
  }
};
