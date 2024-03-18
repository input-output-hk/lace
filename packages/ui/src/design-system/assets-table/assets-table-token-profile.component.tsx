import React from 'react';

import { Box } from '../box';
import { Grid, Cell } from '../grid';
import { Image } from '../profile-picture';
import * as Typography from '../typography';

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
          <Typography.Body.Large weight="$semibold">
            {name}
          </Typography.Body.Large>
          <Box>
            <Typography.Body.Normal color="secondary" weight="$semibold">
              {description}
            </Typography.Body.Normal>
          </Box>
        </Cell>
      </Grid>
    </div>
  );
};
