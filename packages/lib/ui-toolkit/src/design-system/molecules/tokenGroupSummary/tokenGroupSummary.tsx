import { useTranslation } from '@lace-contract/i18n';
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

import { useTheme, spacing } from '../../../design-tokens';
import { Icon, Text, Column } from '../../atoms';
import { Thumbnail } from '../../atoms/thumbnail/thumbnail';

const NO_IMG_ICON_PADDING = 10;

export type TokenGroupSummaryProps = {
  tokens: Array<{
    icon?: React.ReactElement | { uri: string };
    name: string;
  }>;
  type: 'nfts' | 'tokens';
  size?: number;
  hideTokensLabel?: boolean;
};

export const TokenGroupSummary: React.FC<TokenGroupSummaryProps> = ({
  tokens,
  size = 24,
  type = 'tokens',
  hideTokensLabel = false,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const displayTokens = tokens.slice(0, tokens.length > 3 ? 3 : 3); // Always up to 3
  const hasEllipsis = tokens.length > 3;
  const overlap = size * 0.35;
  const borderRadius = type === 'nfts' ? 2 : (size - 4) / 2;
  const shapeRadius = type === 'nfts' ? 4 : size / 2;

  const label =
    type === 'tokens' ? t('v2.generic.btn.tokens') : t('v2.generic.btn.nfts');

  const rowStyle = useMemo(
    () => ({
      minHeight: size,
      minWidth: size,
    }),
    [size],
  );

  const baseShapeStyle = useMemo(
    () => ({
      width: size,
      height: size,
      borderRadius: shapeRadius,
      backgroundColor: theme.background.primary,
      borderColor: theme.border.middle,
    }),
    [size, shapeRadius, theme.background.primary, theme.border.middle],
  );

  const shapeStyle = (index: number) => ({
    ...baseShapeStyle,
    left: index * (size - overlap),
  });

  const thumbnailStyle = useMemo(
    () => ({
      borderRadius: borderRadius,
    }),
    [borderRadius],
  );

  const ellipsisStyle = useMemo(
    () => ({
      ...baseShapeStyle,
      left: 3 * (size - overlap),
    }),
    [baseShapeStyle, size, overlap],
  );

  const spacerStyle = useMemo(
    () => ({
      width: hasEllipsis
        ? 4 * (size - overlap) + overlap
        : displayTokens.length * (size - overlap) + overlap,
      height: size,
    }),
    [size, overlap, displayTokens.length, hasEllipsis],
  );

  const ellipsisTextStyle = useMemo(
    () => ({
      color: theme.text.primary,
      fontSize: size * 0.7,
      lineHeight: size,
    }),
    [size, theme],
  );

  const countTextStyle = useMemo(
    () => ({
      color: theme.text.secondary,
    }),
    [theme],
  );

  const renderTokenContent = (token: {
    icon?: React.ReactElement | { uri: string };
    name: string;
  }) => {
    if (!token.icon)
      return <Icon name="ImageNotFound" size={size - NO_IMG_ICON_PADDING} />;

    // Check if icon is a React element (JSX)
    if (React.isValidElement(token.icon)) {
      return token.icon;
    }

    // Otherwise treat as image source
    return (
      <Thumbnail
        source={token.icon as { uri: string }}
        size={size - 4}
        containerStyle={thumbnailStyle}
      />
    );
  };

  if (tokens.length === 0) {
    return (
      <Column gap={spacing.XS} alignItems="center">
        <Text.XS>0</Text.XS>
        {!hideTokensLabel && (
          <Text.XS testID={`account-card-${type}-summary`}>{label}</Text.XS>
        )}
      </Column>
    );
  }

  return (
    <View style={styles.outerRow}>
      <View style={[styles.innerRow, rowStyle]}>
        {displayTokens.map((token, index) => (
          <View key={index} style={[styles.shape, shapeStyle(index)]}>
            {renderTokenContent(token)}
          </View>
        ))}
        {hasEllipsis && (
          <View style={[styles.shape, ellipsisStyle]}>
            <Text.XS style={[styles.ellipsisText, ellipsisTextStyle]}>
              {'…'}
            </Text.XS>
          </View>
        )}
        <View style={[styles.spacer, spacerStyle]} />
      </View>
      {!hideTokensLabel && (
        <Text.XS
          style={[styles.countText, countTextStyle]}
          testID={`account-card-${type}-summary`}>
          {[tokens.length, label].join(' ')}
        </Text.XS>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  outerRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  shape: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    zIndex: 10,
    shadowColor: 'rgba(0,0,0,0.02)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  ellipsisText: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  spacer: {
    opacity: 0,
  },
  countText: {
    textAlign: 'center',
    marginTop: 2,
  },
});
