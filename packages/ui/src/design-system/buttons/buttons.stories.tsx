import React from 'react';

import type { Meta } from '@storybook/react';

import { ReactComponent as QuestionMark } from '../../assets/icons/question-mark.component.svg';
import { ThemeColorScheme, ThemeProvider } from '../../design-tokens';
import { Page, Variants, Section } from '../decorators';
import { Divider } from '../divider';
import { Grid, Cell } from '../grid';

import { CallToAction } from './call-to-aciton-button';
import { Primary } from './primary-button';
import { Secondary } from './secondary-button';

const subtitle = `A button gives the user a way to trigger an immediate action. Some buttons are specialized for particular tasks, such as navigation, repeated actions, or presenting menus.`;

export default {
  title: 'Buttons/Main',
  component: Primary,
  decorators: [
    (Story): JSX.Element => (
      <Page title="Main Button" subtitle={subtitle}>
        <Story />
      </Page>
    ),
  ],
} as Meta;

const Buttons = (): JSX.Element => (
  <>
    <Variants.Row>
      <Variants.Cell>
        <Primary label="Label" icon={<QuestionMark />} />
      </Variants.Cell>
      <Variants.Cell>
        <Primary label="Label" id="hover" icon={<QuestionMark />} />
      </Variants.Cell>
      <Variants.Cell>
        <Primary label="Label" id="pressed" icon={<QuestionMark />} />
      </Variants.Cell>
      <Variants.Cell>
        <Primary label="Label" disabled icon={<QuestionMark />} />
      </Variants.Cell>
      <Variants.Cell>
        <Primary label="Label" id="focused" icon={<QuestionMark />} />
      </Variants.Cell>
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell>
        <Primary label="Label" />
      </Variants.Cell>
      <Variants.Cell>
        <Primary label="Label" id="hover" />
      </Variants.Cell>
      <Variants.Cell>
        <Primary label="Label" id="pressed" />
      </Variants.Cell>
      <Variants.Cell>
        <Primary label="Label" disabled />
      </Variants.Cell>
      <Variants.Cell>
        <Primary label="Label" id="focused" />
      </Variants.Cell>
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell>
        <CallToAction label="Label" />
      </Variants.Cell>
      <Variants.Cell>
        <CallToAction label="Label" id="hover" />
      </Variants.Cell>
      <Variants.Cell>
        <CallToAction label="Label" id="pressed" />
      </Variants.Cell>
      <Variants.Cell>
        <CallToAction label="Label" disabled />
      </Variants.Cell>
      <Variants.Cell>
        <CallToAction label="Label" id="focused" />
      </Variants.Cell>
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell>
        <Secondary label="Label" />
      </Variants.Cell>
      <Variants.Cell>
        <Secondary label="Label" id="hover" />
      </Variants.Cell>
      <Variants.Cell>
        <Secondary label="Label" id="pressed" />
      </Variants.Cell>
      <Variants.Cell>
        <Secondary label="Label" disabled />
      </Variants.Cell>
      <Variants.Cell>
        <Secondary label="Label" id="focused" />
      </Variants.Cell>
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell>
        <Secondary label="Label" icon={<QuestionMark />} />
      </Variants.Cell>
      <Variants.Cell>
        <Secondary label="Label" id="hover" icon={<QuestionMark />} />
      </Variants.Cell>
      <Variants.Cell>
        <Secondary label="Label" id="pressed" icon={<QuestionMark />} />
      </Variants.Cell>
      <Variants.Cell>
        <Secondary label="Label" disabled icon={<QuestionMark />} />
      </Variants.Cell>
      <Variants.Cell>
        <Secondary label="Label" id="focused" icon={<QuestionMark />} />
      </Variants.Cell>
    </Variants.Row>
  </>
);

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Variants">
        <Variants.Table
          headers={[
            'Primary icon',
            'Primary simple',
            'Call to Action',
            'Secondary simple',
            'Secondary icon',
          ]}
        >
          <Variants.Row>
            <Variants.Cell>
              <Primary label="Label" icon={<QuestionMark />} />
            </Variants.Cell>
            <Variants.Cell>
              <Primary label="Label" />
            </Variants.Cell>
            <Variants.Cell>
              <CallToAction label="Label" />
            </Variants.Cell>
            <Variants.Cell>
              <Secondary label="Label" />
            </Variants.Cell>
            <Variants.Cell>
              <Secondary label="Label" icon={<QuestionMark />} />
            </Variants.Cell>
          </Variants.Row>
        </Variants.Table>
        <Divider my="$64" />
      </Section>
      <Section title="Main components">
        <Variants.Table
          headers={['Rest', 'Hover', 'Active / pressed', 'Disabled', 'Focused']}
        >
          <Buttons />
        </Variants.Table>

        <ThemeProvider colorScheme={ThemeColorScheme.Dark}>
          <Variants.Table>
            <Buttons />
          </Variants.Table>
        </ThemeProvider>
      </Section>
    </Cell>
  </Grid>
);

Overview.parameters = {
  pseudo: {
    hover: '#hover',
    focus: '#focused',
    active: '#pressed',
  },
};
