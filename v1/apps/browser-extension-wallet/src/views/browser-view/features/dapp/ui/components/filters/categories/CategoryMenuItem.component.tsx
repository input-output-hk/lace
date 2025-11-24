import React from 'react';
import { Image } from 'antd';
import { Cell, Flex, Grid, Text } from '@input-output-hk/lace-ui-toolkit';
import * as styles from './CategoryMenuItem.css';

export interface CategoryData {
  icon: string;
  name: string;
}

export interface CategoryMenuItemState {
  isSelected?: boolean;
}

export interface CategoryMenuItemSignals {
  onClick?: () => void;
}

export type CategoryMenuItemProps = CategoryData & CategoryMenuItemState & CategoryMenuItemSignals;

export const CategoryMenuItem = ({ icon, name, isSelected, onClick }: CategoryMenuItemProps): JSX.Element => (
  <div
    className={styles.container({
      state: isSelected ? styles.States.Selected : styles.States.Default
    })}
    onClick={onClick}
  >
    <Grid columns="$fitContent" gutters="$16">
      <Cell>
        <Flex alignItems="center" h="$fill">
          <Image src={icon} width="18" height="16" alt={name} />
        </Flex>
      </Cell>
      <Cell>
        <Flex justifyContent="center" flexDirection="column" h="$fill">
          <Text.Body.Large weight="$semibold">{name}</Text.Body.Large>
        </Flex>
      </Cell>
    </Grid>
  </div>
);
