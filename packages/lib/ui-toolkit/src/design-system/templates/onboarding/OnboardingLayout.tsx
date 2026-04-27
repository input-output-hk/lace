import type { ImageSourcePropType } from 'react-native';

import React, { useMemo } from 'react';
import {
  View,
  ImageBackground,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';

import { useTheme } from '../../../design-tokens';
import { assets } from '../../assets';
import { getIsWideLayout } from '../../util/commons';
interface OnboardingLayoutProps {
  children: React.ReactNode;
}

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  children,
}) => {
  const { width, height } = useWindowDimensions();
  const { theme } = useTheme();
  const isWideLayout = getIsWideLayout(width);

  const imageSource = useMemo(
    () =>
      (theme.name === 'dark'
        ? assets.portalDark
        : assets.portalLight) as ImageSourcePropType,
    [theme.name],
  );

  const wideContainerStyle = useMemo(
    () => [
      styles.splitContainer,
      { height, backgroundColor: theme.background.page },
    ],
    [height, theme.background.page],
  );

  const wideContentStyle = useMemo(
    () => [styles.contentContainer, { backgroundColor: theme.background.page }],
    [theme.background.page],
  );

  if (isWideLayout) {
    return (
      <View style={wideContainerStyle}>
        {/* Left half - Background */}
        <View style={styles.backgroundContainer}>
          <ImageBackground
            source={imageSource}
            resizeMode="cover"
            style={styles.splitBackground}
          />
        </View>

        {/* Right half - Content */}
        <View style={wideContentStyle}>{children}</View>
      </View>
    );
  }

  // Mobile/narrow layout - background as overlay
  return <View style={styles.mobileContainer}>{children}</View>;
};

const styles = StyleSheet.create({
  splitContainer: {
    flexDirection: 'row',
    width: '100%',
  },
  backgroundContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  splitBackground: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    flex: 1,
  },
  mobileContainer: {
    flex: 1,
  },
});
