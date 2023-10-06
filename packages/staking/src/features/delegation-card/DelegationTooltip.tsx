import { Box, Flex, RichContentInner, TooltipContentRendererProps } from '@lace/ui';
import { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import * as styles from './DelegationTooltip.css';
import { DistributionItem } from './types';

export const DelegationTooltip = ({
  active,
  name,
  payload,
}: Readonly<TooltipContentRendererProps<DistributionItem>>): ReactElement | null => {
  const { t } = useTranslation();
  if (active && payload) {
    const { apy, saturation } = payload;

    return (
      <Box className={styles.tooltip}>
        <RichContentInner
          title={name || ''}
          description={
            <Box w="$148">
              <Flex justifyContent="space-between">
                <Box>{t('browsePools.stakePoolTableBrowser.tableHeader.ros.title')}</Box>
                <Box>{apy ? `${apy}%` : '-'}</Box>
              </Flex>
              <Flex justifyContent="space-between">
                <Box>{t('browsePools.stakePoolTableBrowser.tableHeader.saturation.title')}</Box>
                <Box>{saturation ? `${saturation}%` : '-'}</Box>
              </Flex>
            </Box>
          }
        />
      </Box>
    );
  }

  // eslint-disable-next-line unicorn/no-null
  return null;
};
