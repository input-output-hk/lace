/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import React from 'react';

import type { Meta } from '@storybook/react';

import { LocalThemeProvider, ThemeColorScheme } from '../../design-tokens';
import { page, Section, Variants } from '../decorators';
import { Divider } from '../divider';
import { Cell, Grid } from '../grid';

import * as Select from './index';

import type { SelectAlign, SelectVariant } from './types';

export default {
  title: 'Input Fields / Select input',
  component: Select.Root,
  decorators: [
    page({
      title: 'Select dropdown',
      subtitle:
        'The classic dropdown list view displays data stacked vertically in a single column. Classic dropdown is composed ' +
        'of items that have text as a focal point, and for collections that are meant to be read top to bottom (i.e. ' +
        'alphabetically ordered).',
    }),
  ],
} as Meta;

const placeholder = 'Select an option';
const options = [
  { label: 'Option 1', value: 'option-1' },
  { label: 'Option 2', value: 'option-2' },
  { label: 'Option 3', value: 'option-3' },
  { label: 'Option 4', value: 'option-4' },
];
const alignments: SelectAlign[] = ['bottom', 'selected'];
const variants: SelectVariant[] = ['grey', 'plain', 'outline'];

const SelectAlignment = (): JSX.Element => (
  <Section
    title="Alignment"
    subtitle="Note “selection style” illustrates min. spacing between selector contents, flexible list width and list positioning relative to selector."
  >
    <Variants.Table
      headers={[
        'Alignment: Bottom ("Dropdown Style")',
        'Alignment: Selected ("Selection Style") Default',
      ]}
    >
      <Variants.Row>
        {alignments.map(alignment => (
          <Variants.Cell key={alignment}>
            <Select.Root
              align={alignment}
              variant="outline"
              value={options[2].value}
              onChange={(): void => void 0}
              placeholder={placeholder}
              showArrow
            >
              {options.map(option => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  title={option.label}
                />
              ))}
            </Select.Root>
          </Variants.Cell>
        ))}
      </Variants.Row>
    </Variants.Table>
  </Section>
);

const SelectVariants = (): JSX.Element => (
  <Section
    title="Variants"
    subtitle="Note: Plain and Outline variants share the same list item variants. Examples below also show List Root/Anchor with placeholder value."
  >
    <Variants.Table
      headers={variants.map(
        variant => variant.charAt(0).toUpperCase() + variant.slice(1),
      )}
    >
      <Variants.Row>
        {variants.map(variant => (
          <Variants.Cell key={variant}>
            <Select.Root
              variant={variant}
              value={undefined}
              onChange={(): void => void 0}
              placeholder={placeholder}
              showArrow
            >
              {options.map(option => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  title={option.label}
                />
              ))}
            </Select.Root>
          </Variants.Cell>
        ))}
      </Variants.Row>
    </Variants.Table>
    <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
      <Variants.Table>
        <Variants.Row>
          {variants.map(variant => (
            <Variants.Cell key={variant}>
              <Select.Root
                variant={variant}
                value={undefined}
                onChange={(): void => void 0}
                placeholder={placeholder}
                showArrow
              >
                {options.map(option => (
                  <Select.Item
                    key={option.value}
                    value={option.value}
                    title={option.label}
                  />
                ))}
              </Select.Root>
            </Variants.Cell>
          ))}
        </Variants.Row>
      </Variants.Table>
    </LocalThemeProvider>
  </Section>
);

const SelectRootVariants = (): JSX.Element => (
  <Section
    title="Sub Component — List Root"
    subtitle="Illustrated in open and closed states for all variants. Selector can have defined width or hug contents (with minimum 8px spacing)."
  >
    {[ThemeColorScheme.Light, ThemeColorScheme.Dark].map(colorScheme => (
      <LocalThemeProvider colorScheme={colorScheme} key={colorScheme}>
        {variants.map(variant => (
          <Variants.Table
            key={variant}
            headers={[
              `${variant}: Rest`,
              `${variant}: Hover`,
              `${variant}: Open`,
              `${variant}: Disabled`,
              `${variant}: Focused`,
            ]}
          >
            <Variants.Row>
              <Variants.Cell>
                <Select.Root
                  variant={variant}
                  value={undefined}
                  onChange={(): void => void 0}
                  placeholder={placeholder}
                  showArrow
                >
                  {options.map(option => (
                    <Select.Item
                      key={option.value}
                      value={option.value}
                      title={option.label}
                    />
                  ))}
                </Select.Root>
              </Variants.Cell>
              <Variants.Cell>
                <Select.Root
                  id="hover"
                  variant={variant}
                  value={undefined}
                  onChange={(): void => void 0}
                  placeholder={placeholder}
                  showArrow
                >
                  {options.map(option => (
                    <Select.Item
                      key={option.value}
                      value={option.value}
                      title={option.label}
                    />
                  ))}
                </Select.Root>
              </Variants.Cell>
              <Variants.Cell>
                <Select.Root
                  variant={variant}
                  value={undefined}
                  onChange={(): void => void 0}
                  placeholder={placeholder}
                  showArrow
                >
                  {options.map(option => (
                    <Select.Item
                      key={option.value}
                      value={option.value}
                      title={option.label}
                    />
                  ))}{' '}
                </Select.Root>
              </Variants.Cell>
              <Variants.Cell>
                <Select.Root
                  disabled
                  variant={variant}
                  value={undefined}
                  onChange={(): void => void 0}
                  placeholder={placeholder}
                  showArrow
                >
                  {options.map(option => (
                    <Select.Item
                      key={option.value}
                      value={option.value}
                      title={option.label}
                    />
                  ))}
                </Select.Root>
              </Variants.Cell>
              <Variants.Cell>
                <Select.Root
                  id="focused"
                  variant={variant}
                  value={undefined}
                  onChange={(): void => void 0}
                  placeholder={placeholder}
                  showArrow
                >
                  {options.map(option => (
                    <Select.Item
                      key={option.value}
                      value={option.value}
                      title={option.label}
                    />
                  ))}
                </Select.Root>
              </Variants.Cell>
            </Variants.Row>
          </Variants.Table>
        ))}
      </LocalThemeProvider>
    ))}
  </Section>
);

export const Overview = (): JSX.Element => (
  <Grid>
    <Cell>
      <Divider my="$64" />
      <SelectAlignment />
      <Divider my="$64" />
      <SelectVariants />
      <Divider my="$64" />
      <SelectRootVariants />
    </Cell>
  </Grid>
);

Overview.parameters = {
  pseudo: {
    hover: '#hover',
    active: '#pressed',
    focusVisible: '#focused',
  },
};
