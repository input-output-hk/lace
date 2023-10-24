import React from 'react';

import { Flex } from '../flex';
import { Grid, Cell } from '../grid';
import { TextLink } from '../text-link';
import * as Typography from '../typography';

import * as cx from './metadata.css';

import type { OmitClassName } from '../../types';

type Props = OmitClassName<'div'> & {
  label: string;
  text: string;
  url: string;
};

export const MetadataLink = ({
  label,
  text,
  url,
  ...props
}: Readonly<Props>): JSX.Element => {
  return (
    <Grid {...props} columns="$6">
      <Cell colStart="$1" colEnd="$3">
        <Typography.Body.Normal className={cx.label}>
          {label}
        </Typography.Body.Normal>
      </Cell>
      <Cell colStart="$3" colEnd="$7">
        <Flex justifyContent="flex-end" h="$fill">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <TextLink label={text} />
          </a>
        </Flex>
      </Cell>
    </Grid>
  );
};
