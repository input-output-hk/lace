import { Meta, StoryObj } from '@storybook/react';
import { WalletUsedAddressDropdown } from './WalletUsedAddressDrowdown';

const meta: Meta<typeof WalletUsedAddressDropdown> = {
  component: WalletUsedAddressDropdown,
  parameters: {
    layout: 'centered'
  },
  title: 'Components / Used addresses'
};

export default meta;

type Story = StoryObj<typeof WalletUsedAddressDropdown>;

export const SharedWalletLayoutComponent: Story = {
  args: {
    items: [
      {
        id: 0,
        address:
          'addr_test1qz9kum802qxqf72ztg77a83j9lx2xle37v0wy2qprauqdw7d2yfye8mcz8jh6k86d5t7zx2f4z5n4twk0acn956zulusujyj9k'
      },
      {
        id: 1,
        address:
          'addr_test1qp6fthxfu3cxjt2nxv48xcvy67svd88wclhyeuhd3yhreg7d2yfye8mcz8jh6k86d5t7zx2f4z5n4twk0acn956zulusm0yyl9'
      },
      {
        id: 2,
        address:
          'addr_test1qz9kum802qxqf72ztg77a83j9lx2xle37v0wy2qprauqdwawe0l8st0r87mr9emgcuxmuguaa9pz9ujp6c83ktquz2eshvgz7k'
      },
      {
        id: 3,
        address:
          'addr_test1qz9kum802qxqf72ztg77a83j9lx2xle37v0wy2qprauqdwlapc0aztwy7p0pwjmt4t0wa02nhemd6f5hcpgyt37y0j6qe5k28v'
      }
    ],
    translations: {
      title: 'Title',
      subtitle: 'Subtitle'
    }
  }
};
