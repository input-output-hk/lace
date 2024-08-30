import { DappListItem, DappListItemData } from '../list/DappListItem.component';
import React from 'react';
import { Cell, Box, Grid } from '@input-output-hk/lace-ui-toolkit';

export const DappList = ({ items }: { items: Array<DappListItemData> }) => (
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
