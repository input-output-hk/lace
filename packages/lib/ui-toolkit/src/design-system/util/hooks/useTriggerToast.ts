import { useCallback, useMemo } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';

import { TOAST_TRANSLATE_Y } from '..';

interface UseTriggerToastOptions {
  duration?: number;
  position?: 'bottom' | 'top';
}

export const useTriggerToast = ({
  duration = 2,
  position = 'top',
}: UseTriggerToastOptions = {}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(
    position === 'top' ? -TOAST_TRANSLATE_Y : TOAST_TRANSLATE_Y,
  );

  const showToast = useCallback(() => {
    opacity.value = 0;
    translateY.value =
      position === 'top' ? -TOAST_TRANSLATE_Y : TOAST_TRANSLATE_Y;

    opacity.value = withSequence(
      withTiming(1, { duration: 300 }),
      withDelay(duration * 1000, withTiming(0, { duration: 300 })),
    );

    translateY.value = withSequence(
      withTiming(0, { duration: 300 }),
      withDelay(
        duration * 1000,
        withTiming(
          position === 'top' ? -TOAST_TRANSLATE_Y : TOAST_TRANSLATE_Y,
          { duration: 300 },
        ),
      ),
    );
  }, [duration, position, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(
    () => ({
      position: 'absolute',
      zIndex: 10000,
      width: '100%',
      ...(position === 'top' ? { top: 100 } : { bottom: 50 }),
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    }),
    [position, opacity, translateY],
  );

  return useMemo(
    () => ({ showToast, animatedStyle }),
    [showToast, animatedStyle],
  );
};
