import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Column, Loader, Text } from '../../../atoms';
import { SheetHeader } from '../../../molecules';
import { Sheet } from '../../../organisms';

import type { Theme } from '../../../../design-tokens';

interface HeaderProps {
  headerTitle: string;
  loadingText: string;
  isLoading?: boolean;
  theme: Theme;
}

interface ContentProps {
  hasCardanoData?: boolean;
  hasRewardData?: boolean;
  rewardDetails?: React.ReactNode;
  activityDetails?: React.ReactNode;
}

interface ActivityDetailSheetProps {
  headerProps: HeaderProps;
  contentProps: ContentProps;
}

export const ActivityDetailSheetTemplate = ({
  headerProps,
  contentProps,
}: ActivityDetailSheetProps) => {
  const { headerTitle, loadingText, isLoading = false, theme } = headerProps;
  const { hasRewardData, rewardDetails, activityDetails } = contentProps;

  const renderDetails = useCallback((): React.ReactNode => {
    return hasRewardData ? rewardDetails : activityDetails;
  }, [hasRewardData, rewardDetails, activityDetails]);

  return (
    <>
      <SheetHeader title={headerTitle} testID="activity-details-sheet-header" />
      <Sheet.Scroll
        testID="activity-details-sheet"
        contentContainerStyle={styles.contentContainer}>
        <Column style={styles.content}>
          {isLoading ? (
            <Column
              alignItems="center"
              gap={spacing.M}
              style={styles.loadingContainer}>
              <Loader
                size={24}
                testID="activity-details-loader"
                color={theme.icons.background}
              />
              <Text.M>{loadingText}</Text.M>
            </Column>
          ) : (
            renderDetails()
          )}
        </Column>
      </Sheet.Scroll>
    </>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: spacing.XL,
    paddingTop: spacing.M,
  },
  content: {
    flex: 1,
    gap: spacing.L,
    alignItems: 'center',
    paddingHorizontal: spacing.M,
    paddingTop: spacing.M,
    paddingBottom: spacing.XXL,
  },
  loadingContainer: {
    marginVertical: spacing.XXXL,
  },
});
