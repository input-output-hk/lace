import React, { useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';

import { lightTheme } from '../../../design-tokens/theme/light';
import { LinearGradientComponent } from '../../atoms/linearGradient/linearGradient';

import { SplashLogo } from './splash-logo';

const ROTATION_DURATION_MS = 2000;

// White ("negative") variant of the brand logo, so it reads cleanly on the
// purple background instead of blending its purple arc into it.
const LOGO_HEIGHT = 56;

// Mobile only: brief hold on the static frame (pixel-matching the native splash)
// before the rotation + gradient animate in, so the native-to-custom handoff
// lands on an identical frame with no perceptible jump.
const STATIC_HOLD_MS = 200;
const GRADIENT_FADE_IN_MS = 600;

// How long the `static-then-animate` reveal (hold + gradient fade-in) needs to
// stay on screen to actually play — callers gating the splash's minimum
// visible time (e.g. BootGate) should use this instead of an arbitrary
// duration, so the floor tracks the animation instead of drifting from it.
export const STATIC_ENTRY_ANIMATION_MS = STATIC_HOLD_MS + GRADIENT_FADE_IN_MS;

// Global timestamp stamped by the extension's inline HTML splash at first paint.
// Used to phase-align the React rotation with the already-running CSS rotation
// so the HTML-to-React handoff has no angle snap.
const SPLASH_T0_KEY = '__LACE_SPLASH_T0';

/**
 * `animated` — start already rotating (extension): the inline HTML splash is
 * already spinning, so we seed the rotation from its start time to continue
 * seamlessly. Solid background to match the HTML splash.
 *
 * `static-then-animate` — start on the static frame that matches the native
 * splash (mobile), then animate in the rotation and morph the solid background
 * into the brand gradient.
 */
export type SplashEntryMode = 'animated' | 'static-then-animate';

const getSeedAngle = (): number => {
  const t0 = (globalThis as { [SPLASH_T0_KEY]?: number })[SPLASH_T0_KEY];
  if (typeof t0 !== 'number') return 0;
  const elapsed = (globalThis.performance?.now?.() ?? 0) - t0;
  return ((elapsed % ROTATION_DURATION_MS) / ROTATION_DURATION_MS) * 360;
};

export const Splash = ({
  entryMode = 'animated',
}: {
  entryMode?: SplashEntryMode;
}) => {
  const { width, height } = useWindowDimensions();
  const seedAngle = entryMode === 'animated' ? getSeedAngle() : 0;
  const rotation = useSharedValue(seedAngle);
  const gradientOpacity = useSharedValue(0);

  // Run exactly once on mount: the animation is seeded from the mount-time
  // values and then self-drives. Empty deps are intentional, not an omission.
  // `rotation`/`gradientOpacity` are stable shared-value refs, and `seedAngle`
  // (in 'animated' mode) is time-based and recomputed every render — including
  // it as a dependency would restart the rotation on each render. (No
  // eslint-disable: react-hooks/exhaustive-deps is not enabled for this package.)
  useEffect(() => {
    const spin = withRepeat(
      withTiming(seedAngle + 360, {
        duration: ROTATION_DURATION_MS,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    if (entryMode === 'static-then-animate') {
      rotation.value = withDelay(STATIC_HOLD_MS, spin);
      gradientOpacity.value = withDelay(
        STATIC_HOLD_MS,
        withTiming(1, { duration: GRADIENT_FADE_IN_MS, easing: Easing.linear }),
      );
    } else {
      rotation.value = spin;
    }
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

  const animatedGradientStyle = useAnimatedStyle(
    () => ({
      opacity: gradientOpacity.value,
    }),
    [gradientOpacity.value],
  );

  // Display nothing until the dimensions are available to avoid the logo to be rendered
  // with its center in the top left corner of the screen.
  if (width === 0) return null;

  return (
    <View style={[styles.container, { width, height }]}>
      {entryMode === 'static-then-animate' && (
        <Animated.View
          style={[StyleSheet.absoluteFill, animatedGradientStyle]}
          pointerEvents="none">
          <LinearGradientComponent
            colors={[
              lightTheme.brand.ascending,
              lightTheme.brand.ascendingSecondary,
            ]}
            start={[0, 0]}
            end={[1, 1]}
          />
        </Animated.View>
      )}
      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, animatedRotationStyle]}>
          <SplashLogo size={LOGO_HEIGHT} />
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
