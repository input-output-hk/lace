import * as React from 'react';
import cn from 'classnames';
import { Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import { mapCategory } from './mapper';
import styles from './styles.module.scss';

export interface ICategoryChip {
  label: string;
  value: string;
  active?: boolean;
}

const CategoryChip: React.FC<ICategoryChip> = ({ label, value, active }) => (
  <Text.Body.Normal className={cn({ [styles.categoryText]: !!active })} weight="$medium">
    <Flex gap="$12" alignItems="center">
      <span className={styles.imageContainer}>{mapCategory(value)}</span>
      {label}
    </Flex>
  </Text.Body.Normal>
);

export default CategoryChip;
