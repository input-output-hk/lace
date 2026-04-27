import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '../../../design-tokens';
import { Pill, Text, type IconName } from '../../atoms';
import { Icon } from '../../atoms/icons/Icon';

import { ExpandableSectionMetrics } from './tabBar';

import type { Theme } from '../../../design-tokens';
import type { SyncStatus } from '../../atoms';

export interface AccountRowProps {
  leftIcon?: IconName;
  accountName: string;
  walletName: string;
  status: SyncStatus;
  syncingProgress?: number;
}

export const AccountRow: React.FC<AccountRowProps> = ({
  leftIcon,
  accountName,
  walletName,
  status,
  syncingProgress,
}) => {
  const { theme } = useTheme();

  const styles = getStyles(theme);

  const renderIcon = useCallback(() => {
    const IconComponent = leftIcon ? <Icon name={leftIcon} /> : null;
    if (!IconComponent) return null;

    return IconComponent;
  }, [leftIcon]);

  return (
    <View style={styles.container}>
      <View style={styles.column}>
        <View style={styles.row}>
          {renderIcon()}
          <Text.XS>{accountName}</Text.XS>
        </View>
        <Text.XS>{walletName}</Text.XS>
      </View>
      <Pill.SyncStatus status={status} syncingProgress={syncingProgress} />
    </View>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.XS,
    },
    column: { alignItems: 'flex-start', paddingLeft: spacing.M },
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      height: ExpandableSectionMetrics.accountRowHeight,
      marginHorizontal: spacing.M,
      borderTopWidth: 1,
      borderColor: theme.border.top,
    },
    greenOrb: {
      height: 10,
      width: 10,
      borderRadius: radius.squareRounded,
      backgroundColor: theme.data.positive,
    },
  });
