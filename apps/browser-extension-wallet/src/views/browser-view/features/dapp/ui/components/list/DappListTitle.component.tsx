import React, { ReactElement } from 'react';
import { Flex, Text, InfoComponent, Tooltip } from '@input-output-hk/lace-ui-toolkit';
import capitalize from 'lodash/capitalize';

import styles from './DappListTitle.module.scss';

export const DappListTitle = ({ title, count }: { title: string; count?: number }): ReactElement => (
  <Flex alignItems="flex-end">
    <Flex justifyContent="center" alignItems="center" gap="$4">
      <Text.Heading>{capitalize(title)}</Text.Heading>
      <Tooltip label="This is a placeholder text." align="start" side="top">
        <InfoComponent className={styles.icon} />
      </Tooltip>
    </Flex>

    {count !== undefined ? (
      <Text.Label>({count})</Text.Label>
    ) : // eslint-disable-next-line unicorn/no-null
    null}
  </Flex>
);
