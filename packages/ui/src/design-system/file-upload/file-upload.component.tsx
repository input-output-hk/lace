import React from 'react';

import { ReactComponent as CheckFileUploadIcon } from '@lace/icons/dist/CheckFileUploadComponent';
import { ReactComponent as UploadIcon } from '@lace/icons/dist/UploadGradientComponent';
import cn from 'classnames';

import { Box } from '../box';
import { Divider } from '../divider';
import { Flex } from '../flex';
import * as Text from '../typography';

import * as cx from './file-upload.css';

import type { OmitClassName } from '../../types';

type Props = OmitClassName<'input'> & {
  label: { text: string; highlight: boolean }[];
  supportedFormats: string;
  files?: string[];
  removeButtonLabel: string;
  onRemove?: (file: string, index: number) => void;
};

export const FileUpload = ({
  label: labelText,
  supportedFormats,
  id = crypto.randomUUID(),
  accept,
  files = [],
  removeButtonLabel,
  onRemove,
  ...props
}: Readonly<Props>): JSX.Element => (
  <label htmlFor={id} className={cx.root} id={`${id}-label`}>
    <input type="file" id={id} accept={accept} required hidden {...props} />
    <Flex
      className={cx.iconBox}
      mr="$24"
      alignItems="center"
      justifyContent="center"
    >
      <UploadIcon />
    </Flex>
    <Box w="$fill">
      <Box>
        <Box mb="$8">
          {labelText.map(({ text, highlight }) => (
            <Text.Body.Normal
              weight="$medium"
              className={cn({
                [cx.highlightLabel]: highlight,
                [cx.label]: !highlight,
              })}
              key={text}
            >
              {text}{' '}
            </Text.Body.Normal>
          ))}
        </Box>
        <Text.Body.Small weight="$medium" className={cx.supportedFormatText}>
          {supportedFormats}
        </Text.Body.Small>
      </Box>
      {files.length > 0 && (
        <Box w="$fill">
          <Divider my="$16" w="$fill" />
          {files.map((file, index) => (
            <Box key={file}>
              <Flex mb="$8">
                <Text.Body.Small weight="$medium" className={cx.fileName}>
                  {file}
                </Text.Body.Small>
                <Box className={cx.checkIconBox} ml="$8">
                  <CheckFileUploadIcon />
                </Box>
              </Flex>
              <button
                className={cx.removeButtonBox}
                onClick={(): void => {
                  if (onRemove) {
                    onRemove(file, index);
                  }
                }}
              >
                <Text.Label className={cx.removeButtonLabel}>
                  {removeButtonLabel}
                </Text.Label>
              </button>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  </label>
);
