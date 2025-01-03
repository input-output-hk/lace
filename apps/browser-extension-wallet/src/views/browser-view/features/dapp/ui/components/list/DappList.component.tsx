import { DappListItem, DappListItemData } from '../list/DappListItem.component';
import React from 'react';
import { Cell, Box, Grid } from '@input-output-hk/lace-ui-toolkit';

type DappListProps = { items: Array<DappListItemData> };

export const DappList: React.FC<DappListProps> = ({ items }) => (
  <Box mt="$32">
    <Grid columns="$4" rows="$fitContent">
      {items.map((item, index) => (
        <Cell key={`cell-${index}`}>
          <DappListItem icon={item.icon} projectName={item.projectName} longDescription={item.longDescription} />
        </Cell>
      ))}
    </Grid>
  </Box>
);
