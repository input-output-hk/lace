import React, { useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';

import { lightTheme } from '../../../design-tokens/theme/light';
import { LaceLogo } from '../../atoms/logo/logo';

export const Splash = () => {
  const { width, height } = useWindowDimensions();
  const rotation = useSharedValue(0);

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

  // Display nothing until the dimensions are available to avoid the logo to be rendered
  // with its center in the top left corner of the screen.
  if (width === 0) return null;

  return (
    <View style={[styles.container, { width, height }]}>
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
    backgroundColor: lightTheme.brand.ascending,
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
