import * as React from 'react';
import cn from 'classnames';
import { Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import { mapCategory } from './mapper';
import styles from './styles.module.scss';

export interface ICategoryChip {
  label: string;
  active?: boolean;
}

const CategoryChip: React.FC<ICategoryChip> = ({ label, active }) => (
  <Flex gap="$12" alignItems="center">
    {mapCategory(label)}
    <Text.Body.Normal className={cn({ [styles.categoryText]: !!active })} weight="$medium">
      {label}
    </Text.Body.Normal>
  </Flex>
);

export default CategoryChip;
