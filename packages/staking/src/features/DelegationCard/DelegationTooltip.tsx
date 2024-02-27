import { Box, Flex, RichTooltipContent, TooltipContentRendererProps } from '@lace/ui';
import { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { DistributionItem } from './types';

export const DelegationTooltip = ({
  active,
  name,
  payload,
}: Readonly<TooltipContentRendererProps<DistributionItem & { fill?: string }>>): ReactElement | null => {
  const { t } = useTranslation();
  if (active && payload) {
    const { apy, saturation, fill } = payload;

    return (
      <RichTooltipContent
        title={name || ''}
        dotColor={fill}
        description={
          <Box w="$148">
            <Flex justifyContent="space-between">
              <Box>{t('browsePools.stakePoolTableBrowser.tableHeader.apy.title')}</Box>
              <Box>{apy ? `${apy}%` : '-'}</Box>
            </Flex>
            <Flex justifyContent="space-between">
              <Box>{t('browsePools.stakePoolTableBrowser.tableHeader.saturation.title')}</Box>
              <Box>{saturation ? `${saturation}%` : '-'}</Box>
            </Flex>
          </Box>
        }
      />
    );
  }

  // eslint-disable-next-line unicorn/no-null
  return null;
};
