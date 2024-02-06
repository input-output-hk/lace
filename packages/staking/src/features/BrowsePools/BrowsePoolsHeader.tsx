import { Flex, Text, ToggleButtonGroup } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import Table from '../../assets/icons/table-outline.component.svg';
import ViewGrid from '../../assets/icons/tokens-outline.component.svg';
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
      <Text.Body.Normal className={styles.title} weight="$semibold">
        {t('browsePools.header.poolsCount', {
          poolsCount: !Number.isNaN(formattedPoolsCount) ? formattedPoolsCount : 0,
        })}
      </Text.Body.Normal>
      {USE_MULTI_DELEGATION_STAKING_GRID_VIEW && (
        <ToggleButtonGroup.Root variant="compact" value={poolsView} onValueChange={setPoolsView}>
          <ToggleButtonGroup.Item value={BrowsePoolsView.grid} icon={ViewGrid} />
          <ToggleButtonGroup.Item value={BrowsePoolsView.table} icon={Table} />
        </ToggleButtonGroup.Root>
      )}
    </Flex>
  );
};
