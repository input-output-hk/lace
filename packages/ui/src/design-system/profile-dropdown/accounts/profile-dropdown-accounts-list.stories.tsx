import React from 'react';

import type { Meta } from '@storybook/react';

import { page, Variants, Section } from '../../decorators';
import { Flex } from '../../flex';
import { Grid, Cell } from '../../grid';

import { AccountsList } from './profile-dropdown-accounts-list.component';

export default {
  title: 'Navigation and toolbars/Profile Dropdown/Accounts List',
  component: AccountsList,
  decorators: [
    page({
      title: 'AccountsList',
      subtitle: 'Component for the profile dropdown accounts list.',
    }),
  ],
} as Meta;

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Examples">
        <Flex flexDirection="column" alignItems="center" w="$fill">
          <Variants.Table>
            <Variants.Row>
              <Variants.Cell>
                <div style={{ width: '218px' }}>
                  <AccountsList
                    unlockLabel="Unlock"
                    accounts={[
                      {
                        accountNumber: 1,
                        label: 'Account #1',
                        isUnlocked: true,
                        isActive: false,
                      },
                      {
                        accountNumber: 2,
                        label: 'Account #2',
                        isUnlocked: true,
                        isActive: true,
                      },
                      {
                        accountNumber: 3,
                        label: 'Account #3',
                        isUnlocked: false,
                        isActive: false,
                      },
                      {
                        accountNumber: 4,
                        label: 'Account with a long name',
                        isUnlocked: false,
                        isActive: false,
                      },
                      {
                        accountNumber: 10,
                        label: 'Account #10',
                        isUnlocked: false,
                        isActive: false,
                      },
                    ]}
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
