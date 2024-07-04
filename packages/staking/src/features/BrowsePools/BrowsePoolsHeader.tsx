import { Flex, GridComponent, TableComponent, Text, ToggleButtonGroup } from '@input-output-hk/lace-ui-toolkit';
import { useTranslation } from 'react-i18next';
import { USE_MULTI_DELEGATION_STAKING_GRID_VIEW } from '../../featureFlags';
import { formatLocaleNumber } from '../overview/StakingInfoCard/StakingInfoCard';
import * as styles from './BrowsePoolsHeader.css';
import { BrowsePoolsView } from './types';

type BrowsePoolsHeaderProps = {
  poolsCount: number;
  poolsView: BrowsePoolsView;
  setPoolsView: (view: BrowsePoolsView) => void;
};

export const BrowsePoolsHeader = ({ poolsCount, poolsView, setPoolsView }: BrowsePoolsHeaderProps) => {
  const { t } = useTranslation();
  const formattedPoolsCount = formatLocaleNumber(poolsCount, 0);

  return (
    <Flex justifyContent="space-between" alignItems="center">
      <Text.Body.Normal className={styles.title} weight="$semibold" data-testid="pools-counter">
        {t('browsePools.header.poolsCount', {
          poolsCount: poolsCount ? formattedPoolsCount : 0,
        })}
      </Text.Body.Normal>
      {USE_MULTI_DELEGATION_STAKING_GRID_VIEW && (
        <ToggleButtonGroup.Root variant="compact" value={poolsView} onValueChange={setPoolsView}>
          <ToggleButtonGroup.Item value={BrowsePoolsView.grid} icon={GridComponent} data-testid="grid-view-toggle" />
          <ToggleButtonGroup.Item value={BrowsePoolsView.table} icon={TableComponent} data-testid="list-view-toggle" />
        </ToggleButtonGroup.Root>
      )}
    </Flex>
  );
};
