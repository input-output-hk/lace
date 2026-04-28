import { useTranslation } from '@lace-contract/i18n';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '../../../../design-tokens';
import {
  Text,
  Divider,
  Icon,
  Avatar,
  Row,
  Column,
  Beacon,
} from '../../../atoms';
import { SheetFooter, SheetHeader, useFooterHeight } from '../../../molecules';
import { Sheet } from '../../../organisms';
import { isWeb } from '../../../util';

import type { Theme } from '../../../../design-tokens';
import type { AvatarContent } from '../../../../utils/avatarUtils';
import type { IconName } from '../../../atoms';

export type DappConnectorSheetParams = Omit<
  DappConnectorSheetProps,
  'onButtonPress'
>;

export interface DappConnectorSheetProps {
  title: string;
  dapp: {
    icon: AvatarContent;
    name: string;
    category: string;
    coinIcons?: IconName[];
  };
  statistics?: {
    period: string;
    transactions: string;
    volume: string;
    users: string;
  };
  details?: string;
  contact?: {
    email: string;
    website: string;
  };
  buttonUrl: string;
  onButtonPress: () => void;
}

export const DappConnectorSheet = ({
  title,
  dapp,
  statistics,
  details,
  contact,
  buttonUrl,
  onButtonPress,
}: DappConnectorSheetProps) => {
  const { theme } = useTheme();
  const footerHeight = useFooterHeight();
  const styles = getStyles(theme, footerHeight);
  const { t } = useTranslation();

  return (
    <>
      <SheetHeader title={title} showDivider={false} />
      <Sheet.Scroll contentContainerStyle={styles.content}>
        {/* DApp Section */}
        <Column style={styles.dappSection}>
          <Row style={styles.dappRow} alignItems="center">
            <View style={styles.dappIcon}>
              <Avatar size={48} content={dapp.icon} shape="squared" />
            </View>
            <Column style={styles.dappInfo}>
              <Text.M style={styles.dappName}>{dapp.name}</Text.M>
              <Text.S variant="secondary">{dapp.category}</Text.S>
            </Column>
            {dapp.coinIcons && (
              <Row alignItems="center">
                {dapp.coinIcons.slice(0, 3).map((iconName, index) => (
                  <View
                    key={`${iconName}-${index}`}
                    style={
                      index === 0
                        ? styles.coinIconWrapperFirst
                        : styles.coinIconWrapper
                    }>
                    <Beacon
                      backgroundType="colored"
                      color="black"
                      icon={
                        <Icon
                          name={iconName}
                          size={16}
                          color={theme.brand.white}
                          variant="stroke"
                        />
                      }
                    />
                  </View>
                ))}
              </Row>
            )}
          </Row>
        </Column>

        <Divider />

        {/* Statistics Section */}
        {statistics && (
          <>
            <Column style={styles.statisticsSection}>
              <Column style={styles.statisticsHeader}>
                <Row style={styles.statisticsHeaderRow} alignItems="center">
                  <Text.S variant="secondary">
                    {t('v2.generic.label.stats')}
                  </Text.S>
                  <Text.S variant="secondary">{statistics.period}</Text.S>
                </Row>
              </Column>
              <Row>
                <Column style={styles.statisticsItemWithBorder}>
                  <Text.S variant="secondary" style={styles.statisticsLabel}>
                    {t('v2.generic.label.transactions')}
                  </Text.S>
                  <Text.L>{statistics.transactions}</Text.L>
                </Column>
                <Column
                  style={[
                    styles.statisticsItemWithBorder,
                    styles.satisticsItemWithSpacing,
                  ]}>
                  <Text.S variant="secondary" style={styles.statisticsLabel}>
                    {t('v2.generic.label.volume')}
                  </Text.S>
                  <Text.L>{statistics.volume}</Text.L>
                </Column>
                <Column
                  style={[
                    styles.statisticsItem,
                    styles.satisticsItemWithSpacing,
                  ]}>
                  <Text.S variant="secondary" style={styles.statisticsLabel}>
                    {t('v2.generic.label.users')}
                  </Text.S>
                  <Text.L>{statistics.users}</Text.L>
                </Column>
              </Row>
            </Column>

            <Divider />
          </>
        )}

        {/* Details Section */}
        {details && (
          <Column style={styles.detailsSection}>
            <Text.S variant="secondary" style={styles.detailsLabel}>
              {t('v2.generic.label.details')}
            </Text.S>
            <Text.S>{details}</Text.S>
          </Column>
        )}

        {/* Contact Section */}
        {contact && (
          <Column style={styles.contactSection}>
            <Text.S variant="secondary" style={styles.contactLabel}>
              {t('v2.generic.label.contact')}
            </Text.S>
            <Row style={styles.contactItem} alignItems="center" gap={spacing.S}>
              <Icon name="Mail" size={16} />
              <Text.S variant="secondary">{t('v2.generic.label.email')}</Text.S>
              <Text.S>{contact.email}</Text.S>
            </Row>
            <Row style={styles.contactItem} alignItems="center" gap={spacing.S}>
              <Icon name="Globe" size={16} />
              <Text.S variant="secondary">{t('v2.generic.label.web')}</Text.S>
              <Text.S>{contact.website}</Text.S>
            </Row>
          </Column>
        )}
      </Sheet.Scroll>

      <SheetFooter
        primaryButton={{
          label: buttonUrl,
          onPress: onButtonPress,
          preIconName: 'Link',
          iconColor: theme.brand.white,
        }}
        showDivider={true}
      />
    </>
  );
};

const getStyles = (theme: Theme, footerHeight: number) =>
  StyleSheet.create({
    content: {
      padding: spacing.L,
      paddingBottom: footerHeight,
    },
    dappSection: {
      marginVertical: spacing.M,
    },
    dappRow: {
      alignItems: 'center',
      marginBottom: spacing.M,
    },
    dappIcon: {
      marginRight: spacing.M,
    },
    dappInfo: {
      flex: 1,
    },
    dappName: {
      marginBottom: spacing.XS,
    },
    statisticsSection: {
      marginTop: spacing.L,
      marginBottom: spacing.XL,
    },
    statisticsHeader: {
      marginBottom: spacing.M,
    },
    statisticsHeaderRow: {
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.S,
    },
    statisticsItem: {
      flex: 1,
    },
    statisticsItemWithBorder: {
      flex: 1,
      borderRightWidth: 1,
      borderRightColor: theme.border.top,
      paddingRight: spacing.M,
      marginRight: spacing.M,
    },
    satisticsItemWithSpacing: {
      marginLeft: spacing.M,
    },
    statisticsLabel: {
      marginBottom: spacing.XS,
    },
    detailsSection: {
      marginTop: spacing.L,
    },
    detailsLabel: {
      marginBottom: spacing.S,
    },
    contactSection: {
      marginVertical: spacing.XL,
    },
    contactLabel: {
      marginBottom: spacing.S,
    },
    contactItem: {
      marginBottom: spacing.S,
    },
    coinIconWrapper: {
      ...(isWeb
        ? {
            transform: [{ translateX: -spacing.XS }],
          }
        : {
            marginLeft: -spacing.XS,
          }),
      zIndex: 10,
      position: 'relative',
    },
    coinIconWrapperFirst: {
      marginLeft: 0,
      zIndex: 10,
      position: 'relative',
    },
  });
