import { Flex, Text, ToggleButtonGroup } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import Table from '../../assets/icons/table-icon.svg';
import ViewGrid from '../../assets/icons/view-grid-icon.svg';
import { formatLocaleNumber } from '../overview/StakingInfoCard/StakingInfoCard';
import { BrowsePoolsView } from './types';

type BrowsePoolsHeaderProps = {
  poolsCount: number;
  poolsView: BrowsePoolsView;
  setPoolsView: (view: BrowsePoolsView) => void;
};

export const BrowsePoolsHeader = ({ poolsCount, poolsView, setPoolsView }: BrowsePoolsHeaderProps) => {
  const { t } = useTranslation();

  return (
    <Flex justifyContent="space-between" alignItems="center">
      <Text.Body.Normal weight="$bold">
        {t('browsePools.header.poolsCount', { poolsCount: formatLocaleNumber(poolsCount, 0) })}
      </Text.Body.Normal>
      <ToggleButtonGroup.Root variant="compact" value={poolsView} onValueChange={setPoolsView}>
        <ToggleButtonGroup.Item value={BrowsePoolsView.grid} icon={ViewGrid} />
        <ToggleButtonGroup.Item value={BrowsePoolsView.table} icon={Table} />
      </ToggleButtonGroup.Root>
    </Flex>
  );
};
