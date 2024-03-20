import React from 'react';

import { Box } from '../box';
import { Flex } from '../flex';
import { Grid, Cell } from '../grid';
import { Image } from '../profile-picture';
import { Text } from '../text';

import * as cx from './flow-card-profile.css';

interface Props {
  imageSrc: string;
  name: string;
  description?: string;
}

export const Profile = ({
  imageSrc,
  name,
  description,
}: Readonly<Props>): JSX.Element => {
  return (
    <div className={cx.container}>
      <Grid columns="$fitContent" gutters="$0">
        <Cell>
          <Flex className={cx.image} alignItems="center" h="$fill">
            <Image imageSrc={imageSrc} alt={name} />
          </Flex>
        </Cell>
        <Cell>
          <Flex justifyContent="center" flexDirection="column" h="$fill">
            <Text.Body.Large color="primary" weight="$semibold">
              {name}
            </Text.Body.Large>
            {description === undefined ? undefined : (
              <Box>
                <Text.Body.Normal color="secondary" weight="$semibold">
                  {description}
                </Text.Body.Normal>
              </Box>
            )}
          </Flex>
        </Cell>
      </Grid>
    </div>
  );
};
