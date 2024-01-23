import type { Meta, StoryObj } from '@storybook/react';

import { EditAccountDrawer } from './EditAccountDrawer';
import { ComponentProps } from 'react';

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
    subtitle: 'Choose a name to identify your account',
    inputLabel: 'Account name',
    save: 'Save',
    cancel: 'Cancel'
  }
};

export const Overview: Story = {
  args: {
    ...data
  }
};
