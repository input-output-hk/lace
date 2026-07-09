import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { spacing, useTheme } from '../../../../design-tokens';
import { Avatar, Column, Divider, Icon, Row, Text } from '../../../atoms';
import {
  DappDetailsDetailsSection,
  DappDetailsSocialLinksSection,
  DappDetailsStatisticsSection,
} from '../../../molecules';
import { footerHeight, Sheet } from '../../../organisms';

import type { Theme } from '../../../../design-tokens';
import type { ButtonConfig } from '../../../organisms';
import type { DappRating } from '../../dappExplorerPage/dappExplorerPage';

const MAX_RATING_STARS = 5;

const formatRating = (averageRating: number, voteCount: number): string => {
  const stars = Math.max(
    0,
    Math.min(MAX_RATING_STARS, Math.round(averageRating)),
  );
  const filled = '★'.repeat(stars);
  const empty = '☆'.repeat(MAX_RATING_STARS - stars);
  return `${filled}${empty} ${averageRating.toFixed(1)} (${voteCount})`;
};

export type DappDetailsSheetProps = {
  header: {
    name: string;
    categories: string[];
    logoUrl?: string;
    rating?: DappRating | null;
  };
  statistics?: {
    title: string;
    subtitle?: string;
    labels: {
      transactions: string;
      volume: string;
      users: string;
    };
    values: {
      transactions: string;
      volume: string;
      users: string;
    };
  };
  details: {
    title: string;
    description: string;
  };
  socialLinks: {
    title: string;
    links: Array<{ type: string; url: string }>;
  };
  primaryButton: ButtonConfig;
  secondaryButton?: ButtonConfig;
  warning?: string;
  testID?: string;
};

export const DappDetailsSheet = ({
  header,
  statistics,
  details,
  socialLinks,
  warning,
  testID = 'dapp-details-sheet',
}: DappDetailsSheetProps) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const categoriesText = useMemo(
    () => header.categories.join(', '),
    [header.categories],
  );

  const avatarContent = useMemo(
    () => ({
      ...(header.logoUrl && { img: { uri: header.logoUrl } }),
      fallback: header.name,
    }),
    [header.logoUrl, header.name],
  );

  return (
    <Sheet.Scroll
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}>
      <Column style={staticStyles.defaultGap} testID={testID}>
        <Row alignItems="center" style={staticStyles.headerRow}>
          <Avatar
            size={50}
            content={avatarContent}
            testID="dapp-details-avatar"
          />
          <Column style={staticStyles.dappListItemContent}>
            <Text.M numberOfLines={1} testID="dapp-details-name">
              {header.name}
            </Text.M>
            <Text.XS
              ellipsizeMode="tail"
              numberOfLines={1}
              style={styles.categories}
              testID="dapp-details-categories">
              {categoriesText}
            </Text.XS>
            {header.rating?.average_rating != null && (
              <Text.XS variant="secondary" testID="dapp-details-rating">
                {formatRating(
                  header.rating.average_rating,
                  header.rating.vote_count,
                )}
              </Text.XS>
            )}
          </Column>
        </Row>

        {warning && (
          <Row style={styles.warningBanner} testID="dapp-details-scam-warning">
            <Icon name="AlertTriangle" size={16} color={theme.brand.yellow} />
            <Text.XS style={styles.warningText}>{warning}</Text.XS>
          </Row>
        )}

        <Column style={staticStyles.defaultGap}>
          {statistics && <DappDetailsStatisticsSection {...statistics} />}
          <Divider />
          <DappDetailsDetailsSection {...details} />
          <DappDetailsSocialLinksSection {...socialLinks} />
        </Column>
      </Column>
    </Sheet.Scroll>
  );
};

const staticStyles = StyleSheet.create({
  defaultGap: {
    gap: spacing.L,
    marginBottom: spacing.M,
  },
  headerRow: {
    gap: spacing.M,
  },
  dappListItemContent: {
    overflow: 'hidden',
    gap: spacing.XS,
  },
});

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    categories: {
      textTransform: 'capitalize',
      color: theme.text.secondary,
    },
    scrollContainer: { paddingBottom: footerHeight.horizontal },
    warningBanner: {
      alignItems: 'flex-start',
      gap: spacing.XS,
      backgroundColor: theme.brand.yellowSecondary,
      borderRadius: spacing.XS,
      padding: spacing.S,
    },
    warningText: {
      flex: 1,
      color: theme.brand.darkGray,
    },
  });
