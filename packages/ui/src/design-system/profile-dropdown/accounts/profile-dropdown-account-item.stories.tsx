import React from 'react';

import type { Meta } from '@storybook/react';

import { page, Variants, Section } from '../../decorators';
import { Flex } from '../../flex';
import { Grid, Cell } from '../../grid';

import { AccountItem } from './profile-dropdown-account-item.component';

export default {
  title: 'Navigation and toolbars/Profile Dropdown/Account Item',
  component: AccountItem,
  decorators: [
    page({
      title: 'Account Item',
      subtitle: 'Component for the profile dropdown to represent an account.',
    }),
  ],
  argTypes: {
    onEditClick: { action: true },
    onDeleteClick: { action: true },
    onUnlockClick: { action: true },
  },
} as Meta;

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Examples">
        <Flex flexDirection="column" alignItems="center" w="$fill">
          <Variants.Table>
            <Variants.Row>
              <Variants.Cell>
                <div style={{ width: '250px' }}>
                  <AccountItem
                    label="Account #1"
                    unlockLabel="Unlock"
                    isDeletable={true}
                    accountNumber={1}
                    isUnlocked={false}
                  />
                </div>
              </Variants.Cell>
              <Variants.Cell>
                <div style={{ width: '250px' }}>
                  <AccountItem
                    label="Account #2"
                    unlockLabel="Unlock"
                    isDeletable={false}
                    accountNumber={2}
                    isUnlocked
                  />
                </div>
              </Variants.Cell>
            </Variants.Row>
          </Variants.Table>
        </Flex>
      </Section>
    </Cell>
  </Grid>
);
