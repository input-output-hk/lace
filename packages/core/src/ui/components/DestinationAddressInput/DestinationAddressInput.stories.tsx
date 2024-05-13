/* eslint-disable unicorn/no-null */
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { DestinationAddressInput, DestinationAddressInputProps } from './DestinationAddressInput';
import noop from 'lodash/noop';
import { Flex } from '@lace/ui';

const meta: Meta<DestinationAddressInputProps> = {
  title: 'Components/DestinationAddressInput',
  component: DestinationAddressInput,
  parameters: {
    layout: 'centered',
    decorators: {
      theme: null
    }
  },
  render: (props) => (
    <Flex flexDirection="column" alignItems="stretch">
      <DestinationAddressInput {...props} />
    </Flex>
  )
};

export default meta;

type Story = StoryObj<DestinationAddressInputProps>;

const data: DestinationAddressInputProps = {
  value: {
    name: 'My Address',
    address:
      'addr_test1qqmlvzkhufx0f94vqtfsmfa7yzxtwql8ga8aq5yk6u98gn593a82g73tm9n0l6vehusxn3fxwwxhrssgmvnwnlaa6p4qdgdrwh'
  },
  validationObject: { name: true, address: true },
  options: [],
  onChange: noop,
  valid: true,
  translations: {
    recipientAddress: 'Recipient Address'
  }
};

export const Overview: Story = {
  args: {
    ...data
  }
};

export const LongName: Story = {
  args: {
    ...data,
    value: {
      ...data.value,
      name: 'My Payment Address'
    }
  }
};
