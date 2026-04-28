import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';

import { isWeb, truncateText, type ColorType } from '../..';
import { radius, spacing, useTheme } from '../../../design-tokens';
import { BlurView, CustomTag, getLabelColor, Icon, Text } from '../../atoms';

import type { Theme } from '../../../design-tokens';
import type { IconName } from '../../atoms';

export type FlexibleInfo =
  | { title: string; subtitle: string }
  | { title: string; subtitle?: string }
  | { title?: string; subtitle: string };

export type FlexibleValue =
  | { primaryText: string; secondaryText: string; subtitle?: string }
  | { title: { amount: string; label: string }; subtitle: string }
  | { title: { amount: string; label: string }; subtitle?: string }
  | { title?: { amount: string; label: string }; subtitle: string };

export type ActivityCardProps =
  | {
      id: string;
      status: 'failed' | 'pending';
      info: { title: string };
      value: { subtitle: string };
      iconName: IconName;
      iconBackground?: ColorType;
    }
  | {
      id: string;
      status: 'received' | 'sent';
      info: FlexibleInfo;
      value: FlexibleValue;
      iconName: IconName;
      iconBackground?: ColorType;
    }
  | {
      id: string;
      status: 'rewards';
      info: FlexibleInfo;
      value: { title: { amount: string; label: string } };
      iconName: IconName;
      iconBackground?: ColorType;
    };

export const ActivityCard: React.FC<
  ActivityCardProps & { onActivityPress?: (id: string) => void }
> = ({ onActivityPress, ...props }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const { status, info, value, iconName, iconBackground } = props;
  const tagIconColor = getLabelColor(theme, iconBackground, 'semiTransparent');

  // Left tag
  const renderTag = useCallback(
    () => (
      <View style={styles.tagContainer}>
        <CustomTag
          size="S"
          backgroundType="semiTransparent"
          color={iconBackground}
          icon={<Icon name={iconName} size={12} color={tagIconColor} />}
        />
      </View>
    ),
    [iconBackground, iconName, styles.tagContainer, tagIconColor],
  );

  // Info section (left side with flex)
  const renderInfo = useCallback(
    () => (
      <View style={styles.infoSection}>
        {!!info.title && (
          <Text.XS numberOfLines={1} ellipsizeMode="middle" variant="primary">
            {info.title}
          </Text.XS>
        )}
        {'subtitle' in info && !!info.subtitle && (
          <Text.XS variant="secondary" numberOfLines={1}>
            {info.subtitle}
          </Text.XS>
        )}
      </View>
    ),
    [info, theme.text.primary, theme.text.secondary],
  );

  // Value section (right side)
  const renderValue = useCallback(() => {
    const isFailedOrPending = status === 'pending' || status === 'failed';

    const amountVariant = isFailedOrPending ? 'secondary' : 'primary';
    const formattedValue =
      'title' in value && value.title
        ? truncateText(value.title.label, isWeb ? 30 : 20)
        : '';
    return (
      <View style={styles.valueSection}>
        {/* Render amount with label (e.g., "-100.00 ADA") */}
        {'title' in value && !!value.title && (
          <View style={styles.amountRow}>
            <Text.S variant={amountVariant}>{value.title.amount}</Text.S>
            <Text.XS variant="secondary" style={styles.label}>
              {formattedValue}
            </Text.XS>
          </View>
        )}

        {/* Render primary and secondary text (e.g., "5 Assets" with "2 Tokens, 3 NFTs") */}
        {'primaryText' in value && !!value.primaryText && (
          <View style={styles.amountRow}>
            <Text.M variant="primary">{value.primaryText}</Text.M>
            <Text.XS variant="secondary" style={styles.label}>
              {value.secondaryText}
            </Text.XS>
          </View>
        )}

        {/* Render subtitle below if exists */}
        {'subtitle' in value && !!value.subtitle && (
          <Text.XS variant="secondary" style={styles.valueSubtitle}>
            {value.subtitle}
          </Text.XS>
        )}
      </View>
    );
  }, [
    value,
    status,
    theme.text.secondary,
    theme.text.primary,
    theme.text.tertiary,
  ]);

  return (
    <Pressable
      testID={`activity-${props.id}`}
      onPress={() => {
        onActivityPress?.(props.id);
      }}>
      <BlurView testID="activity-list-item" style={styles.container}>
        {renderTag()}
        {renderInfo()}
        {renderValue()}
      </BlurView>
    </Pressable>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radius.M,
      padding: spacing.M,
      marginVertical: spacing.XS,
      minHeight: 64,
      backgroundColor: theme.background.primary,
      overflow: 'hidden',
    },
    tagContainer: {
      marginRight: spacing.S,
    },
    infoSection: {
      flex: 1,
      flexBasis: '25%',
      marginRight: spacing.M,
      justifyContent: 'center',
    },
    valueSection: {
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    label: {
      marginLeft: spacing.XS,
    },
    valueSubtitle: {
      marginTop: spacing.XS,
    },
  });
