import type { ImageSourcePropType } from 'react-native';

import { useTranslation } from '@lace-contract/i18n';
import React from 'react';
import { ImageBackground, StyleSheet } from 'react-native';

import { spacing, useTheme } from '../../../design-tokens';
import { assets } from '../../assets';
import { Column, Text } from '../../atoms';
import { isWeb } from '../../util';

interface EmptyFeatureMessageProps {
  featureName: string;
  message?: string;
  isPage?: boolean;
}

export const EmptyFeatureMessage = ({
  featureName,
  message,
  isPage = false,
}: EmptyFeatureMessageProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const isDark = theme.name === 'dark';

  const backgroundImage = isDark ? assets.bannerBGDark : assets.bannerBGLight;

  const defaultMessage = t('v2.sheets.coming-soon.message');

  const shownMessage = message ?? defaultMessage;

  return (
    <Column
      justifyContent="center"
      alignItems="center"
      style={styles.container}
      gap={spacing.M}>
      {isPage && isWeb && (
        <ImageBackground
          source={backgroundImage as ImageSourcePropType}
          style={styles.absoluteFill}
        />
      )}
      <Text.XL>{featureName}</Text.XL>
      <Text.XL>{shownMessage}</Text.XL>
    </Column>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  absoluteFill: {
    ...StyleSheet.absoluteFillObject,
    height: '100%',
    width: '100%',
  },
});
