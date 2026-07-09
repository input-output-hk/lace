import React, { useMemo } from 'react';
import { StyleSheet, View, type ScrollViewProps } from 'react-native';

import { spacing, useTheme } from '../../../../design-tokens';
import { footerHeight } from '../../../organisms';

import { ActivityHistory } from './ActivityHistory';
import { EpochsRewards } from './EpochsRewards';
import { PoolHeader } from './PoolHeader';
import { PoolStatistics } from './PoolStatistics';

import type { RegularPoolSheetProps } from './regularPoolSheet.types';
import type { Theme } from '../../../../design-tokens';

export const RegularPoolSheetTemplate = ({
  poolName,
  poolTicker,
  totalStaked,
  totalRewards,
  coin,
  stakeKey,
  saturationPercentage,
  activeStake,
  liveStake,
  delegators,
  blocks,
  costPerEpoch,
  pledge,
  poolMargin,
  ros,
  information,
  epochs,
  epochsScale,
  epochsFilterOptions,
  selectedEpochFilter,
  onEpochFilterChange,
  activitySections,
  onActivityPress,
  isLoadingActivities,
  renderScrollComponent,
}: RegularPoolSheetProps & {
  renderScrollComponent?:
    | ((props: ScrollViewProps) => React.ReactElement)
    | undefined;
}) => {
  const { theme } = useTheme();

  const styles = useMemo(() => getStyles(theme), [theme]);

  const contentContainerStyle = useMemo(
    () => ({
      paddingBottom: footerHeight.horizontal,
      marginHorizontal: spacing.M,
    }),
    [],
  );

  const ListHeaderComponent = useMemo(
    () => (
      <View style={styles.container} testID="regular-pool-sheet-content">
        <PoolHeader
          poolName={poolName}
          poolTicker={poolTicker}
          totalStaked={totalStaked}
          totalRewards={totalRewards}
          coin={coin}
          stakeKey={stakeKey}
        />

        <PoolStatistics
          saturationPercentage={saturationPercentage}
          activeStake={activeStake}
          liveStake={liveStake}
          delegators={delegators}
          blocks={blocks}
          costPerEpoch={costPerEpoch}
          pledge={pledge}
          poolMargin={poolMargin}
          ros={ros}
          information={information}
          coin={coin}
        />

        <EpochsRewards
          epochs={epochs}
          epochsScale={epochsScale}
          filterOptions={epochsFilterOptions}
          selectedFilter={selectedEpochFilter}
          onFilterChange={onEpochFilterChange}
        />
      </View>
    ),
    [
      poolName,
      poolTicker,
      totalStaked,
      totalRewards,
      coin,
      stakeKey,
      saturationPercentage,
      activeStake,
      liveStake,
      delegators,
      blocks,
      costPerEpoch,
      pledge,
      poolMargin,
      ros,
      information,
      epochs,
      epochsScale,
      epochsFilterOptions,
      selectedEpochFilter,
      onEpochFilterChange,
      styles,
    ],
  );

  return (
    <ActivityHistory
      activitySections={activitySections}
      onActivityPress={onActivityPress}
      isLoadingActivities={isLoadingActivities}
      ListHeaderComponent={ListHeaderComponent}
      renderScrollComponent={renderScrollComponent}
      contentContainerStyle={contentContainerStyle}
    />
  );
};

const getStyles = (_theme: Theme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingTop: spacing.M,
    },
  });
