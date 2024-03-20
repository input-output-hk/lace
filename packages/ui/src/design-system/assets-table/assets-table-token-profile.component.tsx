import React from 'react';

import { Box } from '../box';
import { Grid, Cell } from '../grid';
import { Image } from '../profile-picture';
import { Text } from '../text';

import * as cx from './assets-table-token-profile.css';

interface Props {
  imageSrc: string;
  name: string;
  description: string;
}

export const TokenProfile = ({
  imageSrc,
  name,
  description,
}: Readonly<Props>): JSX.Element => {
  return (
    <div className={cx.container}>
      <Grid columns="$fitContent" gutters="$0">
        <Cell>
          <Box mr="$24">
            <Image imageSrc={imageSrc} alt={name} />
          </Box>
        </Cell>
        <Cell>
          <Text.Body.Large weight="$semibold">{name}</Text.Body.Large>
          <Box>
            <Text.Body.Normal color="secondary" weight="$semibold">
              {description}
            </Text.Body.Normal>
          </Box>
        </Cell>
      </Grid>
    </div>
  );
};
