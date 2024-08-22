import { ComponentProps } from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { WalletOwnAddressDropdown } from './WalletOwnAddressDropdown';

const meta: Meta<typeof WalletOwnAddressDropdown> = {
  component: WalletOwnAddressDropdown,
  title: 'Components / Wallet Own Addresses',
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof WalletOwnAddressDropdown>;

const data: ComponentProps<typeof WalletOwnAddressDropdown> = {
  addresses: [
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
  // eslint-disable-next-line no-console
  onSelect: (address: string) => console.log(`Selected address: ${address}`),
  placeholder: 'Select an address to use'
};

export const Overview: Story = {
  args: {
    ...data
  }
};

export const EmptyAddressList: Story = {
  args: {
    addresses: [],
    // eslint-disable-next-line no-console
    onSelect: (address: string) => console.log(`Selected address: ${address}`)
  }
};
