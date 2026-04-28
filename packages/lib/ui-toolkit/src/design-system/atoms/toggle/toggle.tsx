import type { PressableProps, ViewStyle } from 'react-native';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

import { radius, spacing, useTheme } from '../../../design-tokens';
import { Text, Row, Icon, Loader } from '../../atoms';
import { hexToRgba } from '../../util/commons';
import { BlurView } from '../blur-view/blur-view';

import type { Theme } from '../../../design-tokens';
import type { IconName } from '../../atoms';

export interface ToggleProps extends Omit<PressableProps, 'style'> {
  /** Whether the toggle is on or off */
  value?: boolean;
  /** Callback when the toggle value changes */
  onValueChange?: (value: boolean) => void;
  /** Whether the toggle is disabled */
  disabled?: boolean;
  /** Optional label text */
  label?: string;
  /** Custom style for the toggle container */
  toggleStyle?: ViewStyle;
  /** Optional pre icon */
  preIcon?: IconName;
  /** Optional post icon */
  postIcon?: IconName;
  /** Whether the toggle is loading */
  isLoading?: boolean;
  /** Optional placeholder text */
  placeholder?: string;
  /** Whether the label and/or placeholder should be on the left side of the toggle */
  reverse?: boolean;
  /** Optional placeholder text on the left side of the toggle */
  placeholderLeft?: string;
  /** Test ID for testing purposes */
  testID?: string;
}

// Animation constants with 2px margins
const ANIMATION_DURATION = 200;
const TRACK_WIDTH = 64;
const KNOB_NORMAL_WIDTH = 30;
const KNOB_EXPANDED_WIDTH = 40;
const MARGIN = 2;

export const Toggle = ({
  value = false,
  onValueChange,
  disabled = false,
  label,
  toggleStyle,
  preIcon,
  postIcon,
  isLoading,
  placeholder,
  reverse,
  placeholderLeft,
  testID,
  ...restProps
}: ToggleProps) => {
  const { theme } = useTheme();
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Animation refs
  const animationValue = useSharedValue(value ? 1 : 0);
  const isFirstRender = useRef(true);
  const previousValue = useRef(value);

  // Memoized styles
  const styles = useMemo(() => createStyles(theme, reverse), [theme, reverse]);

  // Determine if knob should be expanded
  const isKnobExpanded = disabled || isPressed || isHovered;
  const knobWidth = isKnobExpanded ? KNOB_EXPANDED_WIDTH : KNOB_NORMAL_WIDTH;

  const knobWidthAnimated = useSharedValue(knobWidth);
  useEffect(() => {
    knobWidthAnimated.value = withTiming(knobWidth, {
      duration: ANIMATION_DURATION,
    });
  }, [knobWidth, knobWidthAnimated]);

  // Animated styles using useAnimatedStyle
  const knobAnimatedStyle = useAnimatedStyle(() => {
    const currentWidth = knobWidthAnimated.value;
    const offPosition = MARGIN;
    const onPosition = TRACK_WIDTH - currentWidth - MARGIN;

    const translateX = interpolate(
      animationValue.value,
      [0, 1],
      [offPosition, onPosition],
    );

    return {
      transform: [{ translateX }],
      width: currentWidth,
    };
  }, [animationValue]);

  const getTrackColor = () => {
    if (disabled && value) return hexToRgba(theme.data.positive, 0.35);
    if (disabled) return theme.background.tertiary;
    if (value) return theme.data.positive;
    return theme.background.primary;
  };

  const getKnobColor = () => {
    if (disabled) {
      return theme.background.tertiary;
    } else if (isPressed) {
      return theme.brand.lightGray;
    } else {
      return theme.brand.white;
    }
  };

  // Animation effect
  useEffect(() => {
    if (isFirstRender.current) {
      // Set initial value without animation
      animationValue.value = value ? 1 : 0;
      isFirstRender.current = false;
      previousValue.current = value;
      return;
    }

    if (previousValue.current !== value) {
      animationValue.value = withTiming(value ? 1 : 0, {
        duration: ANIMATION_DURATION,
      });
      previousValue.current = value;
    }
  }, [value, animationValue]);

  // Event handlers with useCallback for performance
  const handlePress = useCallback(() => {
    if (!disabled && onValueChange) {
      onValueChange(!value);
    }
  }, [disabled, onValueChange, value]);

  const handlePressIn = useCallback(() => {
    if (!disabled) {
      setIsPressed(true);
    }
  }, [disabled]);

  const handlePressOut = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleHoverIn = useCallback(() => {
    if (!disabled) {
      setIsHovered(true);
    }
  }, [disabled]);

  const handleHoverOut = useCallback(() => {
    if (!disabled) {
      setIsHovered(false);
    }
  }, [disabled]);

  // Create dynamic styles based on current state
  const trackStyle = useMemo(
    () => [styles.track, { backgroundColor: getTrackColor() }],
    [styles.track, disabled, value, theme],
  );

  const knobStyle = useMemo(
    () => [
      styles.knob,
      {
        backgroundColor: getKnobColor(),
        width: knobWidth,
      },
    ],
    [styles.knob, disabled, isPressed, knobWidth, theme],
  );

  const renderLabelContent = () => (
    <Row alignItems="center" style={styles.labelContainer}>
      <Text.S
        style={styles.label}
        testID={testID ? `${testID}-label` : undefined}>
        {label}
      </Text.S>
      {!!postIcon && (
        <Icon
          name={postIcon}
          testID={testID ? `${testID}-post-icon` : undefined}
        />
      )}
    </Row>
  );

  const renderPreIcon = () =>
    !!preIcon && (
      <Icon name={preIcon} testID={testID ? `${testID}-pre-icon` : undefined} />
    );

  const renderPlaceholder = (placeholder: string) => (
    <Text.XS variant="secondary">{placeholder}</Text.XS>
  );

  return (
    <View style={[styles.container, toggleStyle]}>
      <BlurView style={styles.blurWrapper}>
        <View style={trackStyle}>
          <Pressable
            style={styles.pressableArea}
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onHoverIn={handleHoverIn}
            onHoverOut={handleHoverOut}
            disabled={disabled}
            testID={testID}
            accessible={true}
            accessibilityRole="switch"
            accessibilityState={{
              checked: value,
              disabled: disabled,
            }}
            accessibilityLabel={label}
            {...restProps}
          />
          <Animated.View style={[knobStyle, knobAnimatedStyle]} />
        </View>
      </BlurView>
      <Row style={styles.spacing}>
        {!!label && !reverse && (
          <Row alignItems="center" gap={spacing.S}>
            {renderPreIcon()}
            {!!placeholderLeft && renderPlaceholder(placeholderLeft)}

            {renderLabelContent()}
          </Row>
        )}
        <Row
          alignItems="center"
          gap={spacing.S}
          style={styles.placeholderContainer}>
          {isLoading && <Loader color={theme.text.primary} />}
          {!!placeholder && renderPlaceholder(placeholder)}
        </Row>
        {!!label && reverse && (
          <Row alignItems="center" style={styles.labelContainer}>
            {renderPreIcon()}
            {renderLabelContent()}
          </Row>
        )}
      </Row>
    </View>
  );
};

const createStyles = (theme: Theme, reverse?: boolean) =>
  StyleSheet.create({
    container: {
      flexDirection: reverse ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: spacing.S,
      justifyContent: 'space-between',
    },
    blurWrapper: {
      borderRadius: radius.rounded,
      overflow: 'hidden',
    },
    track: {
      width: TRACK_WIDTH,
      height: 28,
      borderRadius: radius.rounded,
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    },
    pressableArea: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 2,
    },
    knob: {
      height: 24,
      borderRadius: radius.rounded,
      position: 'absolute',
      left: 0,
      top: 2,
      zIndex: 1,
    },
    label: {
      color: theme.text.primary,
    },
    labelContainer: {
      flex: 1,
      gap: spacing.S,
    },
    placeholderContainer: {
      flexDirection: 'row-reverse',
    },
    spacing: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      flex: 1,
      gap: spacing.S,
    },
  });
