import React from 'react';

import type { Meta } from '@storybook/react';

import { LocalThemeProvider, ThemeColorScheme } from '../../design-tokens';
import { page, Section, Variants } from '../decorators';
import { Divider } from '../divider';
import { Flex } from '../flex';
import { Cell, Grid } from '../grid';
import { Text } from '../text';

import * as cx from './checkbox.stories.css';

import { Checkbox } from '.';

export default {
  title: 'Input Fields/Checkbox',
  component: Checkbox,
  decorators: [
    page({
      title: 'Check box',
      subtitle: 'A check box component',
    }),
  ],
} as Meta;

const MainComponents = (): JSX.Element => (
  <>
    <Variants.Row>
      <Variants.Cell>
        <Checkbox checked={false} onClick={(): void => void 0} />
      </Variants.Cell>

      <Variants.Cell>
        <Checkbox id="hover" checked={false} onClick={(): void => void 0} />
      </Variants.Cell>
      <Variants.Cell>
        <Checkbox disabled checked={false} onClick={(): void => void 0} />
      </Variants.Cell>
      <Variants.Cell>
        <Checkbox
          className={cx.focus}
          checked={false}
          onClick={(): void => void 0}
        />
      </Variants.Cell>
    </Variants.Row>

    <Variants.Row>
      <Variants.Cell>
        <Checkbox checked onClick={(): void => void 0} />
      </Variants.Cell>

      <Variants.Cell>
        <Checkbox id="hover" checked onClick={(): void => void 0} />
      </Variants.Cell>
      <Variants.Cell>
        <Checkbox disabled checked onClick={(): void => void 0} />
      </Variants.Cell>
      <Variants.Cell>
        <Checkbox className={cx.focus} checked onClick={(): void => void 0} />
      </Variants.Cell>
    </Variants.Row>

    <Variants.Row>
      <Variants.Cell>
        <Checkbox
          checked={false}
          onClick={(): void => void 0}
          label={<Text.Body.Normal weight="$medium">Text</Text.Body.Normal>}
        />
      </Variants.Cell>
      <Variants.Cell>
        <Checkbox
          id="hover"
          checked={false}
          onClick={(): void => void 0}
          label={<Text.Body.Normal weight="$medium">Text</Text.Body.Normal>}
        />
      </Variants.Cell>
      <Variants.Cell>
        <Checkbox
          disabled
          checked={false}
          onClick={(): void => void 0}
          label={<Text.Body.Normal weight="$medium">Text</Text.Body.Normal>}
        />
      </Variants.Cell>
      <Variants.Cell>
        <Checkbox
          className={cx.focus}
          checked={false}
          onClick={(): void => void 0}
          label={<Text.Body.Normal weight="$medium">Text</Text.Body.Normal>}
        />
      </Variants.Cell>
    </Variants.Row>

    <Variants.Row>
      <Variants.Cell>
        <Checkbox
          checked
          onClick={(): void => void 0}
          label={<Text.Body.Normal weight="$medium">Text</Text.Body.Normal>}
        />
      </Variants.Cell>
      <Variants.Cell>
        <Checkbox
          id="hover"
          checked
          onClick={(): void => void 0}
          label={<Text.Body.Normal weight="$medium">Text</Text.Body.Normal>}
        />
      </Variants.Cell>
      <Variants.Cell>
        <Checkbox
          disabled
          checked
          onClick={(): void => void 0}
          label={<Text.Body.Normal weight="$medium">Text</Text.Body.Normal>}
        />
      </Variants.Cell>
      <Variants.Cell>
        <Checkbox
          className={cx.focus}
          checked
          onClick={(): void => void 0}
          label={<Text.Body.Normal weight="$medium">Text</Text.Body.Normal>}
        />
      </Variants.Cell>
    </Variants.Row>
  </>
);

export const Overview = (): JSX.Element => {
  const [isChecked1, setIsChecked1] = React.useState(false);
  const [isChecked2, setIsChecked2] = React.useState(false);

  return (
    <Grid>
      <Cell>
        <Section title="Copy for use">
          <Flex
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            w="$fill"
            my="$32"
          >
            <Flex mr="$8">
              <Checkbox
                checked={isChecked1}
                onClick={(): void => {
                  setIsChecked1(!isChecked1);
                }}
              />
            </Flex>
            <Flex>
              <Checkbox
                checked={isChecked2}
                onClick={(): void => {
                  setIsChecked2(!isChecked2);
                }}
                label={
                  <Text.Body.Normal weight="$medium">Text</Text.Body.Normal>
                }
              />
            </Flex>
          </Flex>
        </Section>

        <Divider my="$64" />

        <Section title="Main components">
          <Variants.Table headers={['Rest', 'Hover', 'Disabled', 'Focused']}>
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
};

Overview.parameters = {
  pseudo: {
    hover: '#hover',
  },
};
