import React, { useEffect, useMemo } from 'react';
import {
  View,
  useColorScheme,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useOptionalTheme } from '../../../design-tokens';

const DEFAULT_SIZE = 25;

interface LoaderProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const Loader = ({
  size = DEFAULT_SIZE,
  color,
  style,
  testID,
}: LoaderProps) => {
  const colorScheme = useColorScheme();
  const themeIconBackgroundColor = useOptionalTheme()?.theme.icons.background;
  const fallbackColor = colorScheme === 'light' ? '#000000' : '#EFEFEF';
  const resolvedColor = color ?? themeIconBackgroundColor ?? fallbackColor;
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1200,
        easing: Easing.linear,
      }),
      -1,
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

  const animatedStyle = useMemo(() => {
    return [{ width: size, height: size }, style].filter(
      Boolean,
    ) as StyleProp<ViewStyle>;
  }, [size, style]);

  return (
    <View testID={testID} style={animatedStyle}>
      <Animated.View style={animatedRotationStyle}>
        <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
          <Path
            d="M10 1V4"
            stroke={resolvedColor}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <Path
            d="M10 16V19"
            stroke={resolvedColor}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <Path
            d="M19 10L16 10"
            stroke={resolvedColor}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <Path
            d="M4 10L1 10"
            stroke={resolvedColor}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <Path
            d="M16.364 3.63574L14.2427 5.75706"
            stroke={resolvedColor}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <Path
            d="M5.75731 14.2422L3.63599 16.3635"
            stroke={resolvedColor}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <Path
            d="M16.364 16.3635L14.2427 14.2422"
            stroke={resolvedColor}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <Path
            d="M5.75731 5.75706L3.63599 3.63574"
            stroke={resolvedColor}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
};
