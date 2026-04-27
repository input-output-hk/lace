import { useTranslation } from '@lace-contract/i18n';
import React, { useMemo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '../../../../design-tokens';
import {
  Avatar,
  Column,
  Divider,
  Icon,
  Row,
  Shimmer,
  Text,
} from '../../../atoms';
import {
  ProgressBar,
  SheetFooter,
  SheetHeader,
  useFooterHeight,
} from '../../../molecules';
import { GenericFlashList } from '../../../organisms';
import { Sheet } from '../../../organisms';
import {
  getSaturationColor,
  getProgressBarColorForTheme,
} from '../../../util/color-utils';

import type { Theme } from '../../../../design-tokens';

const SHIMMER_ROWS = [0, 1, 2];

export interface PoolStatistic {
  label: string;
  value: string;
  showLink?: boolean;
  onLinkPress?: () => void;
}

export interface PoolDetailsSheetProps {
  // Header
  headerTitle: string;

  // Pool Overview
  poolAvatarFallback: string;
  poolName: string;
  poolTicker: string;

  // Statistics
  statisticsLabel: string;
  saturationLabel: string;
  saturationPercentage: number;
  statistics: PoolStatistic[];

  // Information
  informationLabel: string;
  informationText: string;

  // Pool IDs
  poolIdsLabel: string;
  poolIds: string[];

  // Owners
  ownerIds: string[];
  ownersLabel: string;

  // Actions
  onCancelPress: () => void;
  onStakePress: () => void;
  cancelButtonLabel: string;
  stakeButtonLabel: string;
}

export const PoolDetailsSheet = ({
  headerTitle,
  poolAvatarFallback,
  poolName,
  poolTicker,
  statisticsLabel,
  saturationLabel,
  saturationPercentage,
  statistics,
  informationLabel,
  informationText,
  poolIdsLabel,
  poolIds,
  ownerIds,
  ownersLabel,
  onCancelPress,
  onStakePress,
  cancelButtonLabel,
  stakeButtonLabel,
}: PoolDetailsSheetProps) => {
  const { theme } = useTheme();
  const footerHeight = useFooterHeight();
  const defaultStyles = useMemo(
    () => styles(theme, footerHeight),
    [theme, footerHeight],
  );
  const saturationColor = useMemo(
    () => getSaturationColor(saturationPercentage),
    [saturationPercentage],
  );

  const saturationTextStyle = useMemo(
    () => ({
      color: getProgressBarColorForTheme(saturationColor, theme),
    }),
    [saturationColor, theme],
  );

  const renderStatItem = useCallback(
    ({ item: stat, index }: { item: PoolStatistic; index: number }) => {
      const isThirdInRow = index % 3 === 2;
      const isLastItem = index === statistics.length - 1;
      const shouldShowDivider = !isThirdInRow && !isLastItem;

      return (
        <Row style={defaultStyles.statItemRow} alignItems="flex-start">
          <Column
            style={[defaultStyles.statItem, defaultStyles.statItemFlex]}
            gap={spacing.XS}>
            <Text.XS variant="secondary">{stat.label}</Text.XS>
            {stat.showLink ? (
              <Pressable
                onPress={stat.onLinkPress}
                disabled={!stat.onLinkPress}>
                <Row alignItems="center" gap={spacing.XS}>
                  <Text.S>{stat.value}</Text.S>
                  <Icon name="Link" size={14} />
                </Row>
              </Pressable>
            ) : (
              <Text.S>{stat.value}</Text.S>
            )}
          </Column>
          {shouldShowDivider && <View style={defaultStyles.verticalDivider} />}
        </Row>
      );
    },
    [defaultStyles, statistics.length],
  );

  return (
    <>
      <SheetHeader title={headerTitle} />
      <Sheet.Scroll contentContainerStyle={defaultStyles.sheetContent}>
        <Column style={defaultStyles.content} gap={spacing.L}>
          {/* Pool Overview */}
          <Row alignItems="center" gap={spacing.M}>
            <Avatar
              content={{ fallback: poolAvatarFallback }}
              size={38}
              shape="rounded"
            />
            <Column style={defaultStyles.poolInfoColumn}>
              <Text.M>{poolName}</Text.M>
              <Text.XS variant="secondary">{poolTicker}</Text.XS>
            </Column>
          </Row>

          <Divider />

          {/* Statistics Section */}
          <Column gap={spacing.M}>
            <Text.M>{statisticsLabel}</Text.M>
            <Column gap={spacing.S}>
              <Row alignItems="center" justifyContent="space-between">
                <Text.XS variant="secondary">{saturationLabel}</Text.XS>
                <Text.M style={saturationTextStyle}>
                  {saturationPercentage}%
                </Text.M>
              </Row>
              <ProgressBar
                progress={saturationPercentage}
                color={saturationColor}
                showPercentage={false}
              />
            </Column>

            {/* Statistics Grid - Three Column Layout */}
            <View style={defaultStyles.statisticsGrid}>
              <GenericFlashList
                data={statistics}
                numColumns={3}
                scrollEnabled={false}
                nestedScrollEnabled={true}
                renderItem={renderStatItem}
                keyExtractor={(_, index) => `stat-${index}`}
              />
            </View>
          </Column>

          <Divider />

          {/* Information Section */}
          <Column gap={spacing.S}>
            <Row alignItems="center" justifyContent="space-between">
              <Text.M>{informationLabel}</Text.M>
              <Icon name="Globe" size={20} />
            </Row>
            <Text.XS variant="secondary">{informationText}</Text.XS>
          </Column>

          <Divider />

          {/* Pool IDs Section */}
          <Column gap={spacing.S}>
            <Text.M>{poolIdsLabel}</Text.M>
            {poolIds.map((poolId, index) => (
              <Text.XS variant="secondary" key={index}>
                {poolId}
              </Text.XS>
            ))}
          </Column>

          <Divider />

          {/* Owners Section */}
          <Column gap={spacing.S}>
            <Text.M>
              {ownersLabel} ({ownerIds.length})
            </Text.M>
            {ownerIds.map((ownerId, index) => (
              <Text.XS variant="secondary" key={index}>
                {ownerId}
              </Text.XS>
            ))}
          </Column>
        </Column>
      </Sheet.Scroll>
      <SheetFooter
        secondaryButton={{
          label: cancelButtonLabel,
          onPress: onCancelPress,
        }}
        primaryButton={{
          label: stakeButtonLabel,
          onPress: onStakePress,
        }}
      />
    </>
  );
};

export const PoolDetailsSheetSkeleton = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const footerHeight = useFooterHeight();
  const defaultStyles = useMemo(
    () => styles(theme, footerHeight),
    [theme, footerHeight],
  );

  return (
    <>
      <SheetHeader title={t('v2.pages.pool-details.title')} />
      <Sheet.Scroll contentContainerStyle={defaultStyles.sheetContent}>
        <Column style={defaultStyles.content} gap={spacing.L}>
          <Row alignItems="center" gap={spacing.M}>
            <Shimmer width={38} height={38} borderRadius={10} />
            <Column style={defaultStyles.poolInfoColumn} gap={spacing.XS}>
              <Shimmer.M width="long" />
              <Shimmer.XS width="short" />
            </Column>
          </Row>

          <Divider />

          <Column gap={spacing.M}>
            <Shimmer.M width="medium" />
            <Column gap={spacing.S}>
              <Row alignItems="center" justifyContent="space-between">
                <Shimmer.XS width="short" />
                <Shimmer.M width="short" />
              </Row>
              <Shimmer width={320} height={18} borderRadius={8} />
            </Column>

            <View style={defaultStyles.statisticsGrid}>
              <Column gap={spacing.M}>
                {SHIMMER_ROWS.map(row => (
                  <Row key={`stat-skel-row-${row}`}>
                    {SHIMMER_ROWS.map(col => (
                      <View
                        key={`stat-skel-${row}-${col}`}
                        style={defaultStyles.skeletonStatsCell}>
                        <Column
                          style={[
                            defaultStyles.statItem,
                            defaultStyles.statItemFlex,
                          ]}
                          gap={spacing.XS}>
                          <Shimmer.XS width="medium" />
                          <Shimmer.S width="short" />
                        </Column>
                      </View>
                    ))}
                  </Row>
                ))}
              </Column>
            </View>
          </Column>

          <Divider />

          <Column gap={spacing.S}>
            <Row alignItems="center" justifyContent="space-between">
              <Shimmer.M width="medium" />
              <Shimmer width={20} height={20} borderRadius={10} />
            </Row>
            <Shimmer.S width="long" />
            <Shimmer.S width="long" />
          </Column>

          <Divider />

          <Column gap={spacing.S}>
            <Shimmer.M width="medium" />
            <Shimmer.XS width="long" />
            <Shimmer.XS width="long" />
          </Column>

          <Divider />

          <Column gap={spacing.S}>
            <Shimmer.M width="medium" />
            <Shimmer.XS width="long" />
            <Shimmer.XS width="long" />
          </Column>
        </Column>
      </Sheet.Scroll>
    </>
  );
};

const styles = (theme: Theme, footerHeight: number) =>
  StyleSheet.create({
    sheetContent: {
      padding: spacing.L,
      paddingBottom: footerHeight,
    },
    content: {
      paddingTop: spacing.M,
    },
    poolInfoColumn: {
      flex: 1,
    },
    statisticsGrid: {
      marginTop: spacing.S,
    },
    statItemRow: {
      flex: 1,
      paddingRight: spacing.XS,
      marginBottom: spacing.M,
    },
    statItem: {
      flex: 1,
    },
    statItemFlex: {
      flex: 1,
    },
    verticalDivider: {
      width: 1,
      height: '100%',
      backgroundColor: theme.border.top,
      marginLeft: spacing.XS,
    },
    skeletonStatsCell: {
      flex: 1,
      marginBottom: spacing.M,
    },
  });
