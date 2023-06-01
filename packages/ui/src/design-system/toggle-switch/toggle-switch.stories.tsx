import React from 'react';

import type { Meta } from '@storybook/react';

import { ReactComponent as InfoIcon } from '../../assets/icons/info.component.svg';
import { ThemeColorScheme, ThemeProvider } from '../../design-tokens';
import { Page, Variants, Section } from '../decorators';
import { Divider } from '../divider';
import { Grid } from '../grid';
import { Cell } from '../grid/cell.component';

import { ToggleSwitch } from './toggle-switch.component';

const subtitle = `The toggle switch represents a physical switch that allows users to turn things on or off. Use toggle switch controls to present users with two mutually exclusive options (such as on/off), where choosing an option provides immediate results.`;

export default {
  title: 'Basic Input/Toggle switch',
  component: ToggleSwitch,
  decorators: [
    (Story): JSX.Element => (
      <Page title="Toggle switch" subtitle={subtitle}>
        <Story />
      </Page>
    ),
  ],
} as Meta;

const ToggleSwitchPreview = (): JSX.Element => (
  <>
    <Variants.Row>
      <Variants.Cell>
        <ToggleSwitch
          label="Label"
          id="rest"
          defaultChecked
          icon={<InfoIcon />}
        />
      </Variants.Cell>
      <Variants.Cell>
        <ToggleSwitch
          label="Label"
          id="hover"
          defaultChecked
          icon={<InfoIcon />}
        />
      </Variants.Cell>
      <Variants.Cell>
        <ToggleSwitch
          label="Label"
          id="pressed"
          defaultChecked
          icon={<InfoIcon />}
        />
      </Variants.Cell>
      <Variants.Cell>
        <ToggleSwitch
          label="Label"
          disabled
          defaultChecked
          icon={<InfoIcon />}
        />
      </Variants.Cell>
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell>
        <ToggleSwitch label="Label" id="rest" icon={<InfoIcon />} />
      </Variants.Cell>
      <Variants.Cell>
        <ToggleSwitch label="Label" id="hover" icon={<InfoIcon />} />
      </Variants.Cell>
      <Variants.Cell>
        <ToggleSwitch label="Label" id="pressed" icon={<InfoIcon />} />
      </Variants.Cell>
      <Variants.Cell>
        <ToggleSwitch label="Label" disabled icon={<InfoIcon />} />
      </Variants.Cell>
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell>
        <ToggleSwitch label="Label" id="rest" />
      </Variants.Cell>
      <Variants.Cell>
        <ToggleSwitch label="Label" id="hover" />
      </Variants.Cell>
      <Variants.Cell>
        <ToggleSwitch label="Label" id="pressed" />
      </Variants.Cell>
      <Variants.Cell>
        <ToggleSwitch label="Label" disabled />
      </Variants.Cell>
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell>
        <ToggleSwitch id="rest" defaultChecked />
      </Variants.Cell>
      <Variants.Cell>
        <ToggleSwitch id="hover" defaultChecked />
      </Variants.Cell>
      <Variants.Cell>
        <ToggleSwitch id="pressed" defaultChecked />
      </Variants.Cell>
      <Variants.Cell>
        <ToggleSwitch disabled defaultChecked />
      </Variants.Cell>
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell>
        <ToggleSwitch id="rest" />
      </Variants.Cell>
      <Variants.Cell>
        <ToggleSwitch id="hover" />
      </Variants.Cell>
      <Variants.Cell>
        <ToggleSwitch id="pressed" />
      </Variants.Cell>
      <Variants.Cell>
        <ToggleSwitch disabled />
      </Variants.Cell>
    </Variants.Row>
  </>
);

const SwitchPreview = (): JSX.Element => (
  <>
    <Variants.Row>
      <Variants.Cell>
        <ToggleSwitch id="rest" defaultChecked />
      </Variants.Cell>
      <Variants.Cell>
        <ToggleSwitch id="hover" defaultChecked />
      </Variants.Cell>
      <Variants.Cell>
        <ToggleSwitch id="pressed" defaultChecked />
      </Variants.Cell>
      <Variants.Cell>
        <ToggleSwitch disabled defaultChecked />
      </Variants.Cell>
      <Variants.Cell>
        <ToggleSwitch id="focused" defaultChecked />
      </Variants.Cell>
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell>
        <ToggleSwitch id="rest" />
      </Variants.Cell>
      <Variants.Cell>
        <ToggleSwitch id="hover" />
      </Variants.Cell>
      <Variants.Cell>
        <ToggleSwitch id="pressed" />
      </Variants.Cell>
      <Variants.Cell>
        <ToggleSwitch disabled />
      </Variants.Cell>
      <Variants.Cell>
        <ToggleSwitch id="focused" />
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
            'Base control with label and icon',
            'Base control with label',
            'Simple base control',
          ]}
        >
          <Variants.Row>
            <Variants.Cell>
              <ToggleSwitch
                label="Label"
                id="toggle"
                defaultChecked
                icon={<InfoIcon />}
              />
            </Variants.Cell>
            <Variants.Cell>
              <ToggleSwitch label="Label" defaultChecked />
            </Variants.Cell>
            <Variants.Cell>
              <ToggleSwitch defaultChecked />
            </Variants.Cell>
          </Variants.Row>
        </Variants.Table>
        <Divider my="$64" />
      </Section>
      <Section title="Main components">
        <Variants.Table
          headers={['Rest', 'Hover', 'Active / pressed', 'Disabled']}
        >
          <ToggleSwitchPreview />
        </Variants.Table>

        <ThemeProvider colorScheme={ThemeColorScheme.Dark}>
          <Variants.Table>
            <ToggleSwitchPreview />
          </Variants.Table>
        </ThemeProvider>
      </Section>
      <Divider my="$64" />
      <Section title="Toggle switch items 🔒">
        <Variants.Table
          headers={['Rest', 'Hover', 'Active / pressed', 'Disabled', 'Focused']}
        >
          <SwitchPreview />
        </Variants.Table>

        <ThemeProvider colorScheme={ThemeColorScheme.Dark}>
          <Variants.Table>
            <SwitchPreview />
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
