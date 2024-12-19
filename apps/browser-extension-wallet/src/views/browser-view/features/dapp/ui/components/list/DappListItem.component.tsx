import React from 'react';
import { Card, Cell, Box, Flex, Grid, ProfilePicture, Text } from '@input-output-hk/lace-ui-toolkit';

export interface DappListItemData {
  icon: string;
  projectName: string;
  categories?: string[];
  longDescription?: string;
}

export const DappListItem = ({ icon, projectName, longDescription }: DappListItemData): JSX.Element => (
  <Card.Outlined>
    <Box p="$16">
      <Grid columns="$fitContent" gutters="$16">
        <Cell>
          <Flex alignItems="center" h="$fill">
            <ProfilePicture.Image imageSrc={icon} alt={projectName} />
          </Flex>
        </Cell>
        <Cell>
          <Flex justifyContent="center" flexDirection="column" h="$fill">
            <Text.Body.Large weight="$semibold">{projectName}</Text.Body.Large>
            {longDescription === undefined ? undefined : (
              <Box>
                <Text.Body.Normal weight="$semibold">{longDescription}</Text.Body.Normal>
              </Box>
            )}
          </Flex>
        </Cell>
      </Grid>
    </Box>
  </Card.Outlined>
);
