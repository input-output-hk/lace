import React, { useCallback, useState } from 'react';

import { Root as RadixReactToggleGroupRoot } from '@radix-ui/react-toggle-group';
import type { Meta } from '@storybook/react';

import { ReactComponent as Globe } from '../../assets/icons/globe-alt.component.svg';
import { ReactComponent as Home } from '../../assets/icons/home.component.svg';
import { ReactComponent as Key } from '../../assets/icons/key.component.svg';
import { page, Section, UIStateTable, Variants } from '../decorators';
import { Divider } from '../divider';
import { Cell, Grid } from '../grid';

import * as ToggleButtonGroup from './index';

export default {
  title: 'Buttons/Toggle button group',
  component: ToggleButtonGroup.Root,
  decorators: [
    page({
      title: 'Toggle button group',
      subtitle:
        'The Toggle button group (Tab View control) is a way to display a set of tabs and their respective content. Tab Views are useful for displaying several pages (or documents) of content while giving a user the capability to rearrange, open, or close new tabs.',
    }),
  ],
} as Meta;

enum ToggleGroupItemType {
  grid = 'grid',
  list = 'list',
}

const ToggleButtonGroupStorybookContextProvider = ({
  variant = 'wide',
  children,
  disabled = false,
}: Readonly<{
  children: React.ReactNode;
  variant?: 'compact' | 'wide';
  disabled?: boolean;
}>): JSX.Element => (
  <RadixReactToggleGroupRoot
    type="single"
    value="story-active-pressed"
    style={{
      display: variant === 'compact' ? 'inline-flex' : 'flex',
      flexGrow: variant === 'compact' ? 0 : 1,
    }}
    disabled={disabled}
  >
    {children}
  </RadixReactToggleGroupRoot>
);

const ToggleGroupItems = (): JSX.Element => (
  <>
    <Variants.Row>
      <Variants.Cell>
        <ToggleButtonGroupStorybookContextProvider>
          <ToggleButtonGroup.Item value="story-rest">
            Label
          </ToggleButtonGroup.Item>
        </ToggleButtonGroupStorybookContextProvider>
      </Variants.Cell>
      <Variants.Cell>
        <ToggleButtonGroupStorybookContextProvider>
          <ToggleButtonGroup.Item value="story-hover" id="hover">
            Label
          </ToggleButtonGroup.Item>
        </ToggleButtonGroupStorybookContextProvider>
      </Variants.Cell>
      <Variants.Cell>
        <ToggleButtonGroupStorybookContextProvider>
          <ToggleButtonGroup.Item value="story-active-pressed" id="pressed">
            Label
          </ToggleButtonGroup.Item>
        </ToggleButtonGroupStorybookContextProvider>
      </Variants.Cell>
      <Variants.Cell>
        <ToggleButtonGroupStorybookContextProvider disabled>
          <ToggleButtonGroup.Item value="story-disabled">
            Label
          </ToggleButtonGroup.Item>
        </ToggleButtonGroupStorybookContextProvider>
      </Variants.Cell>
      <Variants.Cell>
        <ToggleButtonGroupStorybookContextProvider>
          <ToggleButtonGroup.Item value="story-focused" id="focused">
            Label
          </ToggleButtonGroup.Item>
        </ToggleButtonGroupStorybookContextProvider>
      </Variants.Cell>
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell>
        <ToggleButtonGroupStorybookContextProvider variant="compact">
          <ToggleButtonGroup.Item value="story-rest">
            Label
          </ToggleButtonGroup.Item>
        </ToggleButtonGroupStorybookContextProvider>
      </Variants.Cell>
      <Variants.Cell>
        <ToggleButtonGroupStorybookContextProvider variant="compact">
          <ToggleButtonGroup.Item value="story-hover" id="hover">
            Label
          </ToggleButtonGroup.Item>
        </ToggleButtonGroupStorybookContextProvider>
      </Variants.Cell>
      <Variants.Cell>
        <ToggleButtonGroupStorybookContextProvider variant="compact">
          <ToggleButtonGroup.Item value="story-active-pressed" id="pressed">
            Label
          </ToggleButtonGroup.Item>
        </ToggleButtonGroupStorybookContextProvider>
      </Variants.Cell>
      <Variants.Cell>
        <ToggleButtonGroupStorybookContextProvider variant="compact" disabled>
          <ToggleButtonGroup.Item value="story-disabled">
            Label
          </ToggleButtonGroup.Item>
        </ToggleButtonGroupStorybookContextProvider>
      </Variants.Cell>
      <Variants.Cell>
        <ToggleButtonGroupStorybookContextProvider variant="compact">
          <ToggleButtonGroup.Item value="story-focused" id="focused">
            Label
          </ToggleButtonGroup.Item>
        </ToggleButtonGroupStorybookContextProvider>
      </Variants.Cell>
    </Variants.Row>
  </>
);

export const Overview = (): JSX.Element => {
  const [activeDefault, setActiveDefault] = useState<string>(
    ToggleGroupItemType.grid,
  );
  const handleDefaultValueChange = useCallback(
    (newActive: string): void => {
      setActiveDefault(newActive);
    },
    [setActiveDefault],
  );
  const [activeVariants, setActiveVariants] = useState<string>(
    ToggleGroupItemType.grid,
  );
  const handleVariantsValueChange = useCallback(
    (newActive: string): void => {
      setActiveVariants(newActive);
    },
    [setActiveVariants],
  );

  return (
    <Grid columns="$1">
      <Cell>
        <Section title="Variants">
          <Variants.Table headers={['(Wide) Label + Icon & Icon only']}>
            <Variants.Row>
              <Variants.Cell>
                <ToggleButtonGroup.Root
                  value={activeVariants}
                  onValueChange={handleVariantsValueChange}
                >
                  <ToggleButtonGroup.Item
                    value={ToggleGroupItemType.grid}
                    icon={Globe}
                  >
                    Label
                  </ToggleButtonGroup.Item>
                  <ToggleButtonGroup.Item
                    value={ToggleGroupItemType.list}
                    icon={Globe}
                  >
                    Label
                  </ToggleButtonGroup.Item>
                </ToggleButtonGroup.Root>
              </Variants.Cell>
            </Variants.Row>
            <Variants.Row>
              <Variants.Cell>
                <ToggleButtonGroup.Root
                  value={activeVariants}
                  onValueChange={handleVariantsValueChange}
                >
                  <ToggleButtonGroup.Item
                    value={ToggleGroupItemType.grid}
                    icon={Home}
                  />
                  <ToggleButtonGroup.Item
                    value={ToggleGroupItemType.list}
                    icon={Key}
                  />
                </ToggleButtonGroup.Root>
              </Variants.Cell>
            </Variants.Row>
          </Variants.Table>
          <Variants.Table headers={['(Compact) Label + Icon & Icon only']}>
            <Variants.Row>
              <Variants.Cell>
                <ToggleButtonGroup.Root
                  variant="compact"
                  value={activeVariants}
                  onValueChange={handleVariantsValueChange}
                >
                  <ToggleButtonGroup.Item
                    value={ToggleGroupItemType.grid}
                    icon={Globe}
                  >
                    Label
                  </ToggleButtonGroup.Item>
                  <ToggleButtonGroup.Item
                    value={ToggleGroupItemType.list}
                    icon={Globe}
                  >
                    Label
                  </ToggleButtonGroup.Item>
                </ToggleButtonGroup.Root>
              </Variants.Cell>
            </Variants.Row>
            <Variants.Row>
              <Variants.Cell>
                <ToggleButtonGroup.Root
                  value={activeVariants}
                  onValueChange={handleVariantsValueChange}
                  variant="compact"
                >
                  <ToggleButtonGroup.Item
                    value={ToggleGroupItemType.grid}
                    icon={Home}
                  />
                  <ToggleButtonGroup.Item
                    value={ToggleGroupItemType.list}
                    icon={Key}
                  />
                </ToggleButtonGroup.Root>
              </Variants.Cell>
            </Variants.Row>
          </Variants.Table>
        </Section>
        <Divider my="$64" />
        <Section title="Main components">
          <Variants.Table headers={['Default']}>
            <Variants.Row>
              <Variants.Cell>
                <ToggleButtonGroup.Root
                  value={activeDefault}
                  onValueChange={handleDefaultValueChange}
                >
                  <ToggleButtonGroup.Item value={ToggleGroupItemType.grid}>
                    Label
                  </ToggleButtonGroup.Item>
                  <ToggleButtonGroup.Item value={ToggleGroupItemType.list}>
                    Label
                  </ToggleButtonGroup.Item>
                </ToggleButtonGroup.Root>
              </Variants.Cell>
            </Variants.Row>
            <Variants.Row>
              <Variants.Cell>
                <ToggleButtonGroup.Root
                  value={activeDefault}
                  onValueChange={handleDefaultValueChange}
                  variant="compact"
                >
                  <ToggleButtonGroup.Item value={ToggleGroupItemType.grid}>
                    Label
                  </ToggleButtonGroup.Item>
                  <ToggleButtonGroup.Item value={ToggleGroupItemType.list}>
                    Label
                  </ToggleButtonGroup.Item>
                </ToggleButtonGroup.Root>
              </Variants.Cell>
            </Variants.Row>
          </Variants.Table>
        </Section>
        <Divider my="$64" />
        <Section title="Tab view items">
          <UIStateTable>
            <ToggleGroupItems />
          </UIStateTable>
        </Section>
      </Cell>
    </Grid>
  );
};

Overview.parameters = {
  pseudo: {
    hover: '#hover',
    focusVisible: '#focused',
    active: '#pressed',
  },
};
