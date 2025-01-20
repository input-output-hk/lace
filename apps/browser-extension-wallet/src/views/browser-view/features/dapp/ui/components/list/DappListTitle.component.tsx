import React, { ReactElement } from 'react';
import { Flex, Text, InfoComponent, Tooltip } from '@input-output-hk/lace-ui-toolkit';

import styles from './DappListTitle.module.scss';
import { Trans } from 'react-i18next';

export const DappListTitle = ({ title, count }: { title: string; count?: number }): ReactElement => (
  <Flex alignItems="flex-end">
    <Flex justifyContent="center" alignItems="center" gap="$4">
      <Text.Heading>{title}</Text.Heading>
      <Tooltip
        label={
          <Trans
            i18nKey="dappdiscovery.general_info"
            components={{
              p: <p />,
              link1: <a href="https://dappradar.com/" target="_blank" rel="noreferrer" />,
              link2: <a href="https://x.com/home" target="_blank" rel="noreferrer" />,
              link3: (
                <a
                  href="https://dappradar.com/blog/how-to-list-your-dapps-on-dappradar-for-free"
                  target="_blank"
                  rel="noreferrer"
                />
              )
            }}
            style={{ width: '300px' }}
          />
        }
        align="start"
        side="top"
      >
        <InfoComponent className={styles.icon} />
      </Tooltip>
    </Flex>

    {count !== undefined ? (
      <Text.Label>({count})</Text.Label>
    ) : // eslint-disable-next-line unicorn/no-null
    null}
  </Flex>
);
