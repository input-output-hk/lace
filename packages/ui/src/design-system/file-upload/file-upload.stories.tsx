import React from 'react';

import type { Meta } from '@storybook/react';

import { Box } from '../box';
import { page, Section, Variants, ColorSchemaTable } from '../decorators';
import { Divider } from '../divider';
import { Grid } from '../grid';
import { Cell } from '../grid/cell.component';

import { FileUpload } from './file-upload.component';

const subtitle = ``;

export default {
  title: 'Input Fields/File Upload',
  component: FileUpload,
  decorators: [page({ title: 'File Upload', subtitle })],
} as Meta;

const supportedFormats = 'Supported formats: JSON';

const removeButtonLabel = 'Remove';

const RenderFileUpload = ({
  id,
  files,
}: Readonly<{ id?: string; files?: string[] }>): JSX.Element => (
  <FileUpload
    label="Drag & drop or choose file to upload"
    supportedFormats={supportedFormats}
    removeButtonLabel={removeButtonLabel}
    id={id}
    files={files}
  />
);

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Main components">
        <ColorSchemaTable headers={['Default']}>
          <Variants.Row>
            <Variants.Cell>
              <Box w="$342">
                <RenderFileUpload />
              </Box>
            </Variants.Cell>
          </Variants.Row>
        </ColorSchemaTable>
      </Section>

      <Divider my="$64" />

      <Section title="Empty">
        <ColorSchemaTable headers={['Rest', 'Hover']}>
          <Variants.Row>
            <Variants.Cell>
              <RenderFileUpload />
            </Variants.Cell>
            <Variants.Cell>
              <RenderFileUpload id="hover" />
            </Variants.Cell>
          </Variants.Row>
        </ColorSchemaTable>
        <ColorSchemaTable headers={['Active / pressed', 'Focused']}>
          <Variants.Row>
            <Variants.Cell>
              <RenderFileUpload id="pressed" />
            </Variants.Cell>
            <Variants.Cell>
              <RenderFileUpload id="focused" />
            </Variants.Cell>
          </Variants.Row>
        </ColorSchemaTable>
      </Section>

      <Divider my="$64" />

      <Section title="Active">
        <ColorSchemaTable headers={['Default']}>
          <Variants.Row>
            <Variants.Cell>
              <RenderFileUpload files={['Imported file name']} />
            </Variants.Cell>
          </Variants.Row>
        </ColorSchemaTable>
      </Section>
    </Cell>
  </Grid>
);

Overview.parameters = {
  pseudo: {
    hover: '#hover-label',
    focus: '#focused-label',
    active: '#pressed-label',
  },
};
