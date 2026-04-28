import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Appearance } from 'react-native';
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';

import { useTheme } from '../../../design-tokens';
import { lightTheme, darkTheme } from '../../../design-tokens/theme';
import { LaceLogo } from '../../atoms/logo/logo';

export const Splash = () => {
  const { width, height } = Dimensions.get('window');
  const rotation = useSharedValue(0);

  // Always use the active theme from the app
  const { theme } = useTheme();
  const systemColorScheme = Appearance.getColorScheme();

  // Determine background color with fallback
  const backgroundColor =
    theme?.background?.page ||
    (systemColorScheme === 'dark'
      ? darkTheme.background.page
      : lightTheme.background.page);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 2000, // 2 seconds for a full rotation
        easing: Easing.linear,
      }),
      -1, // infinite loop
      false,
    );
  }, []);

  const animatedRotationStyle = useAnimatedStyle(
    () => ({
      transform: [
        {
          rotate: `${rotation.value}deg`,
        },
      ],
    }),
    [rotation.value],
  );

  return (
    <View style={[styles.container, { width, height, backgroundColor }]}>
      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, animatedRotationStyle]}>
          <LaceLogo />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
