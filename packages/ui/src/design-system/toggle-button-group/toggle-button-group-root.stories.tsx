/* eslint-disable functional/no-loop-statements */
import React, { useCallback, useState } from 'react';

import { Root as RadixReactToggleGroupRoot } from '@radix-ui/react-toggle-group';
import type { ComponentStory, Meta } from '@storybook/react';
import { userEvent, within } from '@storybook/testing-library';

import { ReactComponent as Globe } from '../../assets/storybook/globe-alt.component.svg';
import { ReactComponent as Home } from '../../assets/storybook/home.component.svg';
import { ReactComponent as Key } from '../../assets/storybook/key.component.svg';
import { sleep } from '../../test';
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
          <Variants.Table headers={['(Small) Label']}>
            <Variants.Row>
              <Variants.Cell>
                <ToggleButtonGroup.Root
                  variant="small"
                  value={activeVariants}
                  onValueChange={handleVariantsValueChange}
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

const idsByScenario = {
  'label-only': ['tab1-label-only', 'tab2-label-only', 'tab3-label-only'],
  'icon-only': ['tab1-icon-only', 'tab2-icon-only', 'tab3-icon-only'],
  'label-and-icon': [
    'tab1-label-and-icon',
    'tab2-label-and-icon',
    'tab3-label-and-icon',
  ],
};

type Interactions = ComponentStory<typeof ToggleButtonGroup.Root>;
export const Interactions: Interactions = (): JSX.Element => {
  const [labelScenarioActive, setLabelScenarioActive] = useState('tab1');
  const [iconScenarioActive, setIconScenarioActive] = useState('tab1');
  const [labelAndIconScenarioActive, setLabelAndIconScenarioActive] =
    useState('tab1');

  return (
    <Grid columns="$2">
      <Cell>
        <Section title="Scenario: label-only">
          <ToggleButtonGroup.Root
            value={labelScenarioActive}
            onValueChange={(tab): void => {
              setLabelScenarioActive(tab);
            }}
          >
            <ToggleButtonGroup.Item data-testid="tab1-label-only" value="tab1">
              Tab 1
            </ToggleButtonGroup.Item>
            <ToggleButtonGroup.Item data-testid="tab2-label-only" value="tab2">
              Tab 2
            </ToggleButtonGroup.Item>
            <ToggleButtonGroup.Item data-testid="tab3-label-only" value="tab3">
              Tab 3
            </ToggleButtonGroup.Item>
          </ToggleButtonGroup.Root>
        </Section>
      </Cell>
      <Cell />
      <Cell>
        <Section title="Scenario: icon-only">
          <ToggleButtonGroup.Root
            value={iconScenarioActive}
            onValueChange={(tab): void => {
              setIconScenarioActive(tab);
            }}
          >
            <ToggleButtonGroup.Item
              data-testid="tab1-icon-only"
              icon={Globe}
              value="tab1"
            />
            <ToggleButtonGroup.Item
              data-testid="tab2-icon-only"
              icon={Home}
              value="tab2"
            />
            <ToggleButtonGroup.Item
              data-testid="tab3-icon-only"
              icon={Key}
              value="tab3"
            />
          </ToggleButtonGroup.Root>
        </Section>
      </Cell>
      <Cell />
      <Cell>
        <Section title="Scenario: label and icon">
          <ToggleButtonGroup.Root
            value={labelAndIconScenarioActive}
            onValueChange={(tab): void => {
              setLabelAndIconScenarioActive(tab);
            }}
          >
            <ToggleButtonGroup.Item
              data-testid="tab1-label-and-icon"
              icon={Globe}
              value="tab1"
            >
              Tab 1
            </ToggleButtonGroup.Item>
            <ToggleButtonGroup.Item
              data-testid="tab2-label-and-icon"
              icon={Home}
              value="tab2"
            >
              Tab 2
            </ToggleButtonGroup.Item>
            <ToggleButtonGroup.Item
              data-testid="tab3-label-and-icon"
              icon={Key}
              value="tab3"
            >
              Tab 3
            </ToggleButtonGroup.Item>
          </ToggleButtonGroup.Root>
        </Section>
      </Cell>
      <Cell />
    </Grid>
  );
};

Interactions.play = async ({ canvasElement }): Promise<void> => {
  const canvas = within(canvasElement);

  // navigate between scenarios by tab
  for (let index = 0; index < 5; index++) {
    userEvent.tab({ shift: index > 2 });
    await sleep(300);
  }

  // click through the items
  for (const ids of Object.values(idsByScenario)) {
    for (const testId of ids) {
      userEvent.click(canvas.getByTestId(testId));
      await sleep(300);
    }
  }

  // click through the items using only keyboard
  userEvent.keyboard('[ArrowLeft]');
  await sleep(300);
  userEvent.keyboard('[ArrowLeft]');
  await sleep(300);
  userEvent.keyboard('[Space]');
  await sleep(300);
  userEvent.keyboard('[ArrowRight]');
  await sleep(300);
  userEvent.keyboard('[Space]');
};
