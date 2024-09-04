import type { Meta, StoryObj } from '@storybook/react';
import { NamiMigrationUpdatingYourWallet } from './';

const meta: Meta<typeof NamiMigrationUpdatingYourWallet> = {
  title: 'Nami Migration/UpdatingYourWallet',
  component: NamiMigrationUpdatingYourWallet,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof NamiMigrationUpdatingYourWallet>;

export const Overview: Story = {};
