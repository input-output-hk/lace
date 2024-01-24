import React, { useRef, useState } from 'react';

import { action } from '@storybook/addon-actions';
import type { Meta } from '@storybook/react';

import { Flex, Divider, Grid, Cell, Button } from '../';
import { LocalThemeProvider, ThemeColorScheme } from '../../design-tokens';
import { page, Variants, Section } from '../decorators';

// Content component is embedded in `Dialog.Root` but we need this building block to present static dialog content in Storybook
import { Content } from './dialog-content.component';
import { DialogStorybookContextProvider } from './dialog-storybook-context-provider.component';

import * as Dialog from './index';

export default {
  title: 'Modals/Dialog',
  component: Dialog.Root,
  decorators: [page({ title: 'Dialog' })],
} as Meta;

export const Overview = (): JSX.Element => (
  <DialogStorybookContextProvider>
    <Grid columns="$1">
      <Cell>
        <Section title="Variants">
          <Variants.Table headers={['1 button', '2 buttons']}>
            <Variants.Row>
              <Variants.Cell>
                <Content>
                  <Dialog.Title>Title</Dialog.Title>
                  <Dialog.Description>
                    Amet, malesuada aliquet tortor varius faucibus. Etiam
                    natoque blandit nunc congue.
                  </Dialog.Description>
                  <Dialog.Actions>
                    <Dialog.Action label="Label" onClick={action('1-button')} />
                  </Dialog.Actions>
                </Content>
              </Variants.Cell>
              <Variants.Cell>
                <Content>
                  <Dialog.Title>Title</Dialog.Title>
                  <Dialog.Description>
                    Amet, malesuada aliquet tortor varius faucibus. Etiam
                    natoque blandit nunc congue.
                  </Dialog.Description>
                  <Dialog.Actions>
                    <Dialog.Action
                      cancel
                      label="Label"
                      onClick={action('2-buttons-1')}
                    />
                    <Dialog.Action
                      label="Label"
                      onClick={action('2-buttons-2')}
                    />
                  </Dialog.Actions>
                </Content>
              </Variants.Cell>
            </Variants.Row>
          </Variants.Table>
          <Divider my="$64" />

          <Section title="Main components">
            <Variants.Table>
              <Variants.Row>
                <Variants.Cell>
                  <Flex justifyContent="center">
                    <Content>
                      <Dialog.Title>Title</Dialog.Title>
                      <Dialog.Description>
                        Amet, malesuada aliquet tortor varius faucibus. Etiam
                        natoque blandit nunc congue.
                      </Dialog.Description>
                      <Dialog.Actions>
                        <Dialog.Action
                          cancel
                          label="Label"
                          onClick={action('light-button-1')}
                        />
                        <Dialog.Action
                          label="Label"
                          onClick={action('light-button-2')}
                        />
                      </Dialog.Actions>
                    </Content>
                  </Flex>
                </Variants.Cell>
              </Variants.Row>
            </Variants.Table>
            <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
              <Variants.Table>
                <Variants.Row>
                  <Variants.Cell>
                    <Flex justifyContent="center">
                      <Content>
                        <Dialog.Title>
                          Here is a really long multiline Dialog title that
                          showcases the line height
                        </Dialog.Title>
                        <Dialog.Description>
                          Amet, malesuada aliquet tortor varius faucibus. Etiam
                          natoque blandit nunc congue.
                        </Dialog.Description>
                        <Dialog.Actions>
                          <Dialog.Action
                            cancel
                            label="Label"
                            onClick={action('dark-button-1')}
                          />
                          <Dialog.Action
                            label="Label"
                            onClick={action('dark-button-2')}
                          />
                        </Dialog.Actions>
                      </Content>
                    </Flex>
                  </Variants.Cell>
                </Variants.Row>
              </Variants.Table>
            </LocalThemeProvider>
          </Section>
        </Section>
      </Cell>
    </Grid>
  </DialogStorybookContextProvider>
);

interface ConfigurableStoryProps {
  dialogTitle: string;
  dialogDescription: string;
  actionPrimaryTitle: string;
  actionSecondaryTitle?: string;
  zIndex: number;
}

export const Controls = ({
  dialogTitle,
  dialogDescription,
  actionPrimaryTitle,
  actionSecondaryTitle,
  zIndex,
}: Readonly<ConfigurableStoryProps>): JSX.Element => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const dialogTriggerReference = useRef<HTMLButtonElement>(null);

  return (
    <div>
      <Flex justifyContent="center" alignItems="center" h="$fill">
        <Button.CallToAction
          label="Open dialog"
          onClick={(): void => {
            setIsDialogOpen(true);
          }}
          ref={dialogTriggerReference}
        />
      </Flex>
      <Dialog.Root
        open={isDialogOpen}
        setOpen={setIsDialogOpen}
        zIndex={zIndex}
        onCloseAutoFocusRef={dialogTriggerReference}
      >
        <Dialog.Title>{dialogTitle}</Dialog.Title>
        <Dialog.Description>{dialogDescription}</Dialog.Description>
        <Dialog.Actions>
          {actionSecondaryTitle !== undefined && (
            <Dialog.Action
              cancel
              label={actionSecondaryTitle}
              onClick={(): void => {
                setIsDialogOpen(false);
              }}
            />
          )}
          <Dialog.Action
            label={actionPrimaryTitle}
            onClick={(): void => {
              setIsDialogOpen(false);
            }}
          />
        </Dialog.Actions>
      </Dialog.Root>
    </div>
  );
};

Controls.argTypes = {
  open: {
    table: {
      disable: true,
    },
  },
  portalContainer: {
    table: {
      disable: true,
    },
  },
  onCloseAutoFocusRef: {
    table: {
      disable: true,
    },
  },
  zIndex: {
    defaultValue: 0,
    control: {
      type: 'number',
    },
  },
  dialogTitle: {
    defaultValue: 'Switching pool?',
    control: {
      type: 'text',
    },
  },
  dialogDescription: {
    defaultValue:
      "That's totally fine! Just please note that you'll continue receiving rewards from your former pool for two epochs. After that, you'll start receiving rewards from your new pool.",
    control: {
      type: 'text',
    },
  },
  actionPrimaryTitle: {
    defaultValue: 'Fine by me',
    control: {
      type: 'text',
    },
  },
  actionSecondaryTitle: {
    defaultValue: 'Cancel',
    control: {
      type: 'text',
    },
  },
};
