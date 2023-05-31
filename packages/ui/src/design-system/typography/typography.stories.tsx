import React from 'react';

import type { Meta } from '@storybook/react';

import { Page, Section, Variants } from '../decorators';
import { Grid, Cell } from '../grid';

import { Address } from './address.component';
import * as Body from './body.component';
import { Button } from './button.component';
import { Display } from './display.component';
import { Heading } from './heading.component';
import { Label } from './label.component';
import { PageHeading } from './page-heading.component';
import { SubHeading } from './subheading.component';

import type { Theme } from '../../design-tokens';

const subtitle = `As the visual representation of language, typography's main task is to communicate information. Lace defines a set of styles you can use to apply a consistent typographic style across your platform.`;

export default {
  title: 'Typography',
  component: Body.Normal,
  subcomponents: {
    Address,
    'Body.Small': Body.Small,
    'Body.Normal': Body.Normal,
    'Body.Large': Body.Large,
    Button,
    Display,
    Heading,
    Label,
    PageHeading,
    SubHeading,
  },
  decorators: [
    (Story): JSX.Element => (
      <Page title="Typography" subtitle={subtitle}>
        <Story />
      </Page>
    ),
  ],
} as Meta;

type FontWeights = keyof Theme['fontWeights'];

const fill = ({
  $bold = false,
  $medium = false,
  $regular = false,
  $semibold = false,
}: Readonly<{ [k in Partial<FontWeights>]?: boolean }>): string[] => {
  return [
    $regular ? '$regular' : '-',
    $medium ? '$medium' : '-',
    $semibold ? '$semibold' : '-',
    $bold ? '$bold' : '-',
  ];
};

const typefaces = [
  [Label, 'Form Label', fill({ $semibold: true })],
  [Address, 'Address', fill({ $medium: true })],
  [
    Body.Small,
    'Body Small',
    fill({ $medium: true, $semibold: true, $bold: true }),
  ],
  [Button, 'Button', fill({ $semibold: true })],
  [
    Body.Normal,
    'Body',
    fill({ $bold: true, $medium: true, $semibold: true, $regular: true }),
  ],
  [
    Body.Large,
    'Body Large',
    fill({ $bold: true, $medium: true, $semibold: true, $regular: true }),
  ],
  [SubHeading, 'Subheading', fill({ $bold: true, $semibold: true })],
  [Heading, 'Heading', fill({ $bold: true })],
  [PageHeading, 'Page Heading', fill({ $bold: true })],
  [Display, 'Display', fill({ $bold: true })],
] as const;

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Overview">
        <Variants.Table
          headers={['Text', 'Regular', 'Medium', 'Semibold', 'Bold']}
        >
          {typefaces.map(([Component, name, fontWeights]) => (
            <Variants.Row key={`row:${name}`}>
              <Variants.Cell align="left">
                <Component>{name}</Component>
              </Variants.Cell>
              {fontWeights.map((fontWeight, index) => (
                <Variants.Cell
                  key={`${name}:${fontWeight}:${index}`}
                  align={fontWeight === '-' ? 'center' : 'left'}
                >
                  <Component
                    weight={
                      (fontWeight === '-' ? undefined : fontWeight) as never
                    }
                  >
                    {fontWeight === '-' ? '' : name}
                  </Component>
                </Variants.Cell>
              ))}
            </Variants.Row>
          ))}
        </Variants.Table>
      </Section>
    </Cell>
  </Grid>
);
