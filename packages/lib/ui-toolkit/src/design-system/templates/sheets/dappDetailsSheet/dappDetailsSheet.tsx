import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, useTheme } from '../../../../design-tokens';
import { Avatar, Column, Divider, Row, Text } from '../../../atoms';
import {
  DappDetailsDetailsSection,
  DappDetailsSocialLinksSection,
  DappDetailsStatisticsSection,
  SheetFooter,
  useFooterHeight,
} from '../../../molecules';
import { Sheet } from '../../../organisms';

import type { Theme } from '../../../../design-tokens';
import type { SheetFooterProps } from '../../../molecules/sheetFooter/sheetFooter.types';

export type DappDetailsSheetProps = {
  header: {
    name: string;
    categories: string[];
    logoUrl?: string;
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
    descriptionHtml: string;
  };
  socialLinks: {
    title: string;
    links: Array<{ type: string; url: string }>;
  };
  primaryButton: NonNullable<SheetFooterProps['primaryButton']>;
  secondaryButton?: SheetFooterProps['secondaryButton'];
  testID?: string;
};

export const DappDetailsSheet = ({
  header,
  statistics,
  details,
  socialLinks,
  primaryButton,
  secondaryButton,
  testID = 'dapp-details-sheet',
}: DappDetailsSheetProps) => {
  const { theme } = useTheme();
  const footerHeight = useFooterHeight();
  const styles = useMemo(
    () => getStyles(theme, footerHeight),
    [theme, footerHeight],
  );

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

  const { bottom } = useSafeAreaInsets();

  const patchedFooterContainerStyle = useMemo(
    () => [{ transform: [{ translateY: bottom }] }],
    [bottom],
  );

  return (
    <>
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
            </Column>
          </Row>

          <Column style={staticStyles.defaultGap}>
            {statistics && <DappDetailsStatisticsSection {...statistics} />}
            <Divider />
            <DappDetailsDetailsSection {...details} />
            <DappDetailsSocialLinksSection {...socialLinks} />
          </Column>
        </Column>
      </Sheet.Scroll>
      <View style={patchedFooterContainerStyle}>
        <SheetFooter
          primaryButton={primaryButton}
          secondaryButton={secondaryButton}
          testID={`${testID}-footer`}
        />
      </View>
    </>
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

const getStyles = (theme: Theme, footerHeight: number) =>
  StyleSheet.create({
    categories: {
      textTransform: 'capitalize',
      color: theme.text.secondary,
    },
    scrollContainer: {
      paddingBottom: footerHeight,
    },
  });
