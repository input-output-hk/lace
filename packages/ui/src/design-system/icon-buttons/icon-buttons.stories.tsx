import React from 'react';

import type { Meta } from '@storybook/react';

import { ReactComponent as PlainCircle } from '../../assets/icons/plain-circle.component.svg';
import { ReactComponent as PlusCircleIcon } from '../../assets/icons/plus-circle.component.svg';
import { ThemeColorScheme, LocalThemeProvider } from '../../design-tokens';
import { page, Variants, Section } from '../decorators';
import { Divider } from '../divider';
import { Flex } from '../flex';
import { Grid, Cell } from '../grid';

import { Caret } from './caret-button.component';
import { Primary } from './primary-button.component';
import { Secondary } from './secondary-button.component';

const subtitle = `Reusable button component for use in a variety of controls containing only an icon for its content.`;

export default {
  title: 'Buttons/Icon button',
  component: Primary,
  subcomponents: { Secondary, Caret },
  decorators: [page({ title: 'Icon button and caret', subtitle })],
  argTypes: {
    onClick: { action: true },
  },
} as Meta;

const Buttons = (): JSX.Element => (
  <>
    <Variants.Row>
      <Variants.Cell>
        <Primary icon={<PlainCircle />} />
      </Variants.Cell>
      <Variants.Cell>
        <Primary icon={<PlainCircle />} id="hover" />
      </Variants.Cell>
      <Variants.Cell>
        <Primary icon={<PlainCircle />} id="pressed" />
      </Variants.Cell>
      <Variants.Cell>
        <Primary icon={<PlainCircle />} disabled />
      </Variants.Cell>
      <Variants.Cell>
        <Primary icon={<PlainCircle />} id="focused" />
      </Variants.Cell>
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell>
        <Secondary icon={<PlainCircle />} />
      </Variants.Cell>
      <Variants.Cell>
        <Secondary icon={<PlainCircle />} id="hover" />
      </Variants.Cell>
      <Variants.Cell>
        <Secondary icon={<PlainCircle />} id="pressed" />
      </Variants.Cell>
      <Variants.Cell>
        <Secondary icon={<PlainCircle />} disabled />
      </Variants.Cell>
      <Variants.Cell>
        <Secondary icon={<PlainCircle />} id="focused" />
      </Variants.Cell>
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell>
        <Caret />
      </Variants.Cell>
      <Variants.Cell>
        <Caret id="hover" />
      </Variants.Cell>
      <Variants.Cell>
        <Caret id="pressed" />
      </Variants.Cell>
      <Variants.Cell>
        <Caret disabled />
      </Variants.Cell>
      <Variants.Cell>
        <Caret id="focused" />
      </Variants.Cell>
    </Variants.Row>
  </>
);

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Examples">
        <Flex flexDirection="column" alignItems="center" w="$fill">
          <Primary icon={<PlusCircleIcon />} />
          <Secondary icon={<PlusCircleIcon />} />
        </Flex>
      </Section>

      <Divider my="$64" />

      <Section title="Variants">
        <Variants.Table headers={['Primary', 'Secondary', 'Caret']}>
          <Variants.Row>
            <Variants.Cell>
              <Primary icon={<PlainCircle />} />
            </Variants.Cell>
            <Variants.Cell>
              <Secondary icon={<PlainCircle />} />
            </Variants.Cell>
            <Variants.Cell>
              <Caret />
            </Variants.Cell>
          </Variants.Row>
        </Variants.Table>
      </Section>

      <Divider my="$64" />

      <Section title="Main components">
        <Variants.Table
          headers={['Rest', 'Hover', 'Active / pressed', 'Disabled', 'Focused']}
        >
          <Buttons />
        </Variants.Table>

        <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
          <Variants.Table>
            <Buttons />
          </Variants.Table>
        </LocalThemeProvider>
      </Section>
    </Cell>
  </Grid>
);

Overview.parameters = {
  pseudo: {
    hover: '#hover',
    focusVisible: '#focused',
    active: '#pressed',
  },
};
