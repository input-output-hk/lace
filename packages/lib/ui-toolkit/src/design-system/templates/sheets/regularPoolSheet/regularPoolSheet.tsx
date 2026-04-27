import { useBottomSheetScrollableCreator } from '@gorhom/bottom-sheet';
import { useTranslation } from '@lace-contract/i18n';
import React, { useMemo } from 'react';
import { StyleSheet, View, type ScrollViewProps } from 'react-native';

import { spacing, useTheme } from '../../../../design-tokens';
import { SheetFooter, SheetHeader, useFooterHeight } from '../../../molecules';
import { useScrollEventsHandlers } from '../../../organisms/sheet/useScrollEventsHandlers';
import { isWeb } from '../../../util/commons';

import { ActivityHistory } from './ActivityHistory';
import { EpochsRewards } from './EpochsRewards';
import { PoolHeader } from './PoolHeader';
import { PoolStatistics } from './PoolStatistics';

import type { RegularPoolSheetProps } from './regularPoolSheet.types';
import type { Theme } from '../../../../design-tokens';

const RegularPoolSheetTemplate = ({
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
  primaryButtonLabel,
  secondaryButtonLabel,
  onPrimaryPress,
  onSecondaryPress,
  isSecondaryButtonDisabled,
  onActivityPress,
  isLoadingActivities,
  renderScrollComponent,
}: RegularPoolSheetProps & {
  renderScrollComponent?:
    | ((props: ScrollViewProps) => React.ReactElement)
    | undefined;
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const hasFooter = Boolean(
    (primaryButtonLabel && onPrimaryPress) ||
      (secondaryButtonLabel && onSecondaryPress),
  );

  const footerHeight = useFooterHeight();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const contentContainerStyle = useMemo(
    () => ({
      paddingBottom: hasFooter ? footerHeight : spacing.XL,
    }),
    [hasFooter, footerHeight],
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
    <>
      <SheetHeader
        testID="regular-pool-sheet-header"
        title={t('v2.regular-pool.title')}
      />
      <View style={styles.listWrapper}>
        <ActivityHistory
          activitySections={activitySections}
          onActivityPress={onActivityPress}
          isLoadingActivities={isLoadingActivities}
          ListHeaderComponent={ListHeaderComponent}
          renderScrollComponent={renderScrollComponent}
          contentContainerStyle={contentContainerStyle}
        />
      </View>
      {hasFooter && (
        <SheetFooter
          testID="regular-pool-sheet-footer"
          showDivider
          secondaryButton={
            secondaryButtonLabel && onSecondaryPress
              ? {
                  label: secondaryButtonLabel,
                  onPress: onSecondaryPress,
                  disabled: isSecondaryButtonDisabled,
                }
              : undefined
          }
          primaryButton={
            primaryButtonLabel && onPrimaryPress
              ? {
                  label: primaryButtonLabel,
                  onPress: onPrimaryPress,
                }
              : undefined
          }
        />
      )}
    </>
  );
};

/**
 * Native variant: integrates with BottomSheet scroll via useBottomSheetScrollableCreator.
 */
const RegularPoolSheetNative = (props: RegularPoolSheetProps) => {
  const renderScrollComponent = useBottomSheetScrollableCreator({
    scrollEventsHandlersHook: useScrollEventsHandlers,
  });
  return (
    <RegularPoolSheetTemplate
      {...props}
      renderScrollComponent={renderScrollComponent}
    />
  );
};

/**
 * Web variant: uses default ScrollView (no BottomSheet integration).
 */
const RegularPoolSheetWeb = (props: RegularPoolSheetProps) => (
  <RegularPoolSheetTemplate {...props} />
);

export const RegularPoolSheet = isWeb
  ? RegularPoolSheetWeb
  : RegularPoolSheetNative;

const getStyles = (_theme: Theme) =>
  StyleSheet.create({
    listWrapper: {
      flex: 1,
    },
    container: {
      alignItems: 'center',
      marginRight: spacing.S,
      paddingTop: spacing.M,
    },
  });
