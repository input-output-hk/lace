import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { useTheme, radius, spacing } from '../../../design-tokens';
import { Badge, BlurView, Brand } from '../../atoms';
import { isAndroid } from '../../util';

import { TabBarMetrics } from './tabBarMetrics';

import type { Theme } from '../../../design-tokens';
import type { BadgeProps } from '../../atoms';

export interface LaceButtonBadgeProps {
  badge?: number | string;
  badgeColor?: BadgeProps['color'];
}

interface LaceButtonProps extends LaceButtonBadgeProps {
  isMenuOpen: boolean;
  onPress: () => void;
}

const ROTATION_DURATION = 8000; // Time for one full rotation in ms

export const LaceButton: React.FC<LaceButtonProps> = ({
  isMenuOpen,
  onPress,
  badge,
  badgeColor = 'negative',
}) => {
  const { theme } = useTheme();
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const isInitialRender = useRef(true);

  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const styles = useMemo(() => laceButtonStyles({ theme }), [theme]);

  useEffect(() => {
    // Skip animation on initial render
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    // Scale bounce animation (same for both open and close)
    scale.value = withSequence(
      withTiming(0.8, { duration: 100 }),
      withSpring(1, { damping: 8, stiffness: 200 }),
    );

    if (isMenuOpen) {
      // Start continuous slow clockwise rotation from current position
      const startRotation = rotation.value;
      rotation.value = withRepeat(
        withTiming(startRotation + 360, {
          duration: ROTATION_DURATION,
          easing: Easing.linear,
        }),
        -1, // Infinite repeat
        false, // Don't reverse
      );
    } else {
      // Stop the continuous rotation
      cancelAnimation(rotation);

      // Find the nearest multiple of 360 (visually equivalent to 0)
      // This ensures the shortest rotation path back to the original position
      const nearestZeroPosition = Math.round(rotation.value / 360) * 360;

      rotation.value = withTiming(nearestZeroPosition, {
        duration: 200,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [isMenuOpen]);

  const brandAnimatedStyle = useAnimatedStyle(
    () => ({
      transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
    }),
    [scale.value, rotation.value],
  );

  const onHoverIn = useCallback(() => {
    setIsHovered(true);
  }, []);

  const onHoverOut = useCallback(() => {
    setIsHovered(false);
  }, []);

  const buttonStyle = useMemo(
    () =>
      [
        styles.laceButton,
        isAndroid && { backgroundColor: theme.background.primarySolid },
        isHovered && { backgroundColor: theme.background.secondary },
        isMenuOpen && { backgroundColor: theme.brand.ascending },
      ].filter(Boolean),
    [isMenuOpen, theme, isHovered, styles.laceButton],
  );

  const badgeLabel = badge !== undefined ? String(badge) : undefined;

  return (
    <Pressable
      style={buttonStyle}
      onHoverIn={onHoverIn}
      onHoverOut={onHoverOut}
      testID="main-menu-tab-btn"
      onPress={onPress}>
      {!isAndroid && <BlurView style={styles.laceButtonBlur} />}
      {isMenuOpen ? (
        <Svg
          width={TabBarMetrics.laceButton.width}
          height={TabBarMetrics.laceButton.height}
          style={styles.innerShadowSvg}>
          <Defs>
            <RadialGradient
              id="innerShadow"
              cx="50%"
              cy="50%"
              r="100%"
              fx="50%"
              fy="50%">
              <Stop offset="100%" stopColor={theme.background.secondary} />
              <Stop
                offset="32%"
                stopColor={
                  isMenuOpen ? theme.brand.ascending : theme.background.primary
                }
              />
            </RadialGradient>
          </Defs>
          <Circle
            cx={TabBarMetrics.laceButton.width / 2}
            cy={TabBarMetrics.laceButton.height / 2}
            r={TabBarMetrics.laceButton.width / 2}
            fill="url(#innerShadow)"
          />
        </Svg>
      ) : (
        <View style={styles.laceButtonBorder} />
      )}
      <Animated.View style={brandAnimatedStyle}>
        <Brand
          height={42}
          onlyLogo
          variant={isMenuOpen ? 'negative' : 'default'}
        />
      </Animated.View>
      {badgeLabel !== undefined && (
        <Badge
          label={badgeLabel}
          color={badgeColor}
          size={spacing.L}
          style={styles.badge}
        />
      )}
    </Pressable>
  );
};

const laceButtonStyles = ({ theme }: { theme: Theme }) =>
  StyleSheet.create({
    laceButton: {
      width: TabBarMetrics.laceButton.width,
      height: TabBarMetrics.laceButton.height,
      borderRadius: radius.squareRounded,
      backgroundColor: theme.background.primary,
      alignItems: 'center',
      alignSelf: 'center',
      justifyContent: 'center',
      marginHorizontal: spacing.XS,
    },
    laceButtonBorder: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      height: '100%',
      width: '100%',
      borderRadius: radius.squareRounded,
      borderWidth: 1,
      borderColor: theme.border.top,
    },
    laceButtonBlur: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: radius.squareRounded,
      overflow: 'hidden',
    },
    innerShadowSvg: {
      position: 'absolute',
      top: 0,
      left: 0,
    },
    badge: {
      position: 'absolute',
      top: -spacing.XS,
      right: -spacing.XS,
    },
  });
