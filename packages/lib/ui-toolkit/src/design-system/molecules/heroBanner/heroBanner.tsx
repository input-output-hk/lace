import type { ImageSourcePropType } from 'react-native';

import { useTranslation } from '@lace-contract/i18n';
import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Platform,
  Dimensions,
  ImageBackground,
} from 'react-native';

import { spacing, useTheme, radius } from '../../../design-tokens';
import { assets } from '../../assets';
import { LaceLogo, Text } from '../../atoms';

import type { Theme } from '../../../design-tokens';

const { height } = Dimensions.get('window');

type HeroBannerProps = {
  title?: string;
  description?: string;
  bgSource?: ImageSourcePropType;
  footerImageSource?: ImageSourcePropType;
  isStorybook?: boolean;
};

export const HeroBanner = ({
  title,
  description,
  bgSource,
  footerImageSource,
  isStorybook = false,
}: HeroBannerProps) => {
  const { theme } = useTheme();
  const styles = getStyles(theme, isStorybook);
  const { t } = useTranslation();

  const defaultTitle = t('v2.hero-banner.title');
  const defaultDescription = t('v2.hero-banner.description');

  const backgroundImage =
    theme.name === 'dark' ? assets.bannerBGDark : assets.bannerBGLight;

  const renderHeroBackground = useCallback(() => {
    return (
      <View style={styles.heroBackgroundContainer}>
        <ImageBackground
          source={bgSource ?? (backgroundImage as ImageSourcePropType)}
          style={styles.heroBackgroundImage}
          resizeMode="cover"
        />
      </View>
    );
  }, [bgSource]);

  return (
    <View style={styles.container}>
      {renderHeroBackground()}

      <View style={styles.content}>
        <View style={styles.upperContent}>
          <LaceLogo />
          <Text.XL style={styles.title}>{title ?? defaultTitle}</Text.XL>
          <Text.M numberOfLines={2} style={styles.description}>
            {description ?? defaultDescription}
          </Text.M>
        </View>
      </View>

      <View
        style={
          !isStorybook
            ? { ...styles.footerImageContainer }
            : { ...styles.footerImageStorybookContainer }
        }>
        <Image
          source={
            footerImageSource ?? (assets.bannerIcons as ImageSourcePropType)
          }
          style={styles.iconsImage}
          resizeMode={'contain'}
        />
      </View>
    </View>
  );
};

const getStyles = (theme: Theme, isStorybook?: boolean) =>
  StyleSheet.create({
    container: {
      borderRadius: radius.XL,
      position: 'relative',
      alignItems: 'center',
      overflow: 'hidden',
      maxWidth: '95%',
      ...(Platform.OS === 'web'
        ? {
            height: isStorybook ? height * 0.6 : height * 0.4,
          }
        : {
            height: height * 0.3,
          }),
    },
    content: {
      flex: 1,
      justifyContent: 'space-between',
      zIndex: 1,
      alignItems: 'center',
      width: '100%',
    },
    upperContent: {
      gap: spacing.S,
      justifyContent: Platform.OS !== 'web' ? 'center' : 'flex-end',
      alignItems: 'center',
      paddingTop: Platform.OS === 'web' ? spacing.XXL : spacing.M,
    },
    title: {
      color: theme.text.primary,
    },
    description: {
      color: theme.text.secondary,
      textAlign: 'center',
    },
    footerImageContainer: {
      position: 'relative',
    },
    footerImageStorybookContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
    iconsImage: {
      height: 90,
    },
    heroBackgroundContainer: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroBackgroundImage: {
      width: '100%',
      height: '100%',
    },
  });
