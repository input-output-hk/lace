import React from 'react';

import { LocalThemeProvider, ThemeColorScheme } from '../../design-tokens';
import { page, Section, Variants } from '../decorators';
import { Divider } from '../divider';
import { Flex } from '../flex';
import { Cell, Grid } from '../grid';

import { Message, MessageType } from './message.component';

const subtitle = 'This is a message component.';

export default {
  title: 'Status & info/Message',
  component: Message,
  decorators: [page({ title: 'Message', subtitle })],
};

const VariantsTable = (): JSX.Element => (
  <Section title="Variants">
    <Variants.Table
      headers={[
        'Default page message',
        'Page message without title',
        'Default side drawer message',
      ]}
    >
      <Variants.Row>
        <Variants.Cell>
          <Message
            title="Title"
            description="Amet, malesuada aliquet tortor varius faucibus. Etiam natoque blandit nunc congue."
          />
        </Variants.Cell>
        <Variants.Cell>
          <Message description="Amet, malesuada aliquet tortor varius faucibus. Etiam natoque blandit nunc congue." />
        </Variants.Cell>
        <Variants.Cell>
          <Message
            title="Title"
            description="Amet, malesuada aliquet tortor varius faucibus. Etiam natoque blandit nunc congue."
            type={MessageType.SIDE_DRAWER}
          />
        </Variants.Cell>
      </Variants.Row>
    </Variants.Table>
  </Section>
);

const MainComponents = (): JSX.Element => (
  <Variants.Row>
    <Variants.Cell>
      <Message
        title="Title"
        description="Amet, malesuada aliquet tortor varius faucibus. Etiam natoque blandit nunc congue."
      />
    </Variants.Cell>
    <Variants.Cell>
      <Message
        title="Title"
        description="Amet, malesuada aliquet tortor varius faucibus. Etiam natoque blandit nunc congue."
        type={MessageType.SIDE_DRAWER}
      />
    </Variants.Cell>
  </Variants.Row>
);

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Copy for use">
        <Flex flexDirection="column" alignItems="center" w="$fill">
          <Message
            title="Title"
            description="Amet, malesuada aliquet tortor varius faucibus. Etiam natoque blandit nunc congue."
          />
        </Flex>
      </Section>
      <VariantsTable />

      <Divider my="$64" />

      <Section title="Main components">
        <Variants.Table headers={['Default', 'Side drawer']}>
          <MainComponents />
        </Variants.Table>
        <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
          <Variants.Table>
            <MainComponents />
          </Variants.Table>
        </LocalThemeProvider>
      </Section>
    </Cell>
  </Grid>
);
