import React from 'react';

import type { Meta } from '@storybook/react';

import { Variants, Section, page, UIStateTable } from '../decorators';
import { Grid, Cell } from '../grid';

import { TextLink } from './text-link.component';

const subtitle = `Provides an inline-level content element that provides facilities for hosting hyperlinks.`;

export default {
  title: 'Buttons/Text Link',
  component: TextLink,
  decorators: [page({ title: 'Text Link', subtitle })],
} as Meta;

const Buttons = (): JSX.Element => (
  <>
    <Variants.Row>
      <Variants.Cell>
        <TextLink label="Label" />
      </Variants.Cell>
      <Variants.Cell>
        <TextLink label="Label" id="hover" />
      </Variants.Cell>
      <Variants.Cell>
        <TextLink label="Label" id="pressed" />
      </Variants.Cell>
      <Variants.Cell>
        <TextLink label="Label" disabled />
      </Variants.Cell>
      <Variants.Cell>
        <TextLink label="Label" id="focused" />
      </Variants.Cell>
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell>
        <a href="#" id="visited" style={{ textDecoration: 'none' }}>
          <TextLink label="Label" />
        </a>
      </Variants.Cell>
      <Variants.Cell>
        <a href="#" id="visited" style={{ textDecoration: 'none' }}>
          <TextLink label="Label" id="hover" />
        </a>
      </Variants.Cell>
      <Variants.Cell>
        <a href="#" id="visited" style={{ textDecoration: 'none' }}>
          <TextLink label="Label" id="pressed" />
        </a>
      </Variants.Cell>
      <Variants.Cell>
        <a href="#" id="visited" style={{ textDecoration: 'none' }}>
          <TextLink label="Label" disabled />
        </a>
      </Variants.Cell>
      <Variants.Cell>
        <a href="#" id="visited" style={{ textDecoration: 'none' }}>
          <TextLink label="Label" id="focused" />
        </a>
      </Variants.Cell>
    </Variants.Row>
  </>
);

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Main components">
        <UIStateTable>
          <Buttons />
        </UIStateTable>
      </Section>
    </Cell>
  </Grid>
);

Overview.parameters = {
  pseudo: {
    hover: '#hover',
    focus: '#focused',
    active: '#pressed',
    visited: '#visited',
  },
};
