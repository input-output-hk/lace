import type { ViewStyle } from 'react-native';

import { isAndroid } from '@lace-lib/ui-toolkit';
import { PixelRatio } from 'react-native';
import {
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';

import type { SelectedAssetView } from './types';
import type {
  ScrollHandlerProcessed,
  AnimatedStyle,
} from 'react-native-reanimated';

const baseTopLockThreshold = 8;

interface UseScrollAnimationProps {
  headerHeight: number;
  selectedAssetView: SelectedAssetView;
  activeIndex: number;
  headerTopInset: number;
}

interface UseScrollAnimationReturn {
  scrollHandler: ScrollHandlerProcessed<Record<string, unknown>>;
  animatedContainerStyle: AnimatedStyle<ViewStyle>;
  activeAssetView: { value: SelectedAssetView };
  activeAccountIndex: { value: number };
}

export const useScrollAnimation = ({
  headerHeight,
  selectedAssetView,
  activeIndex,
  headerTopInset,
}: UseScrollAnimationProps): UseScrollAnimationReturn => {
  const pixelRatio = PixelRatio.get();

  const activeAssetView = useSharedValue<SelectedAssetView>(selectedAssetView);
  const activeAccountIndex = useSharedValue(activeIndex);
  const scrollYRaw = useSharedValue(0);

  const scrollY = useDerivedValue(() => scrollYRaw.value, []);

  const setScrollY = (y: number) => {
    'worklet';

    const quantized = isAndroid ? Math.round(y * pixelRatio) / pixelRatio : y;
    scrollYRaw.value = quantized;
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      setScrollY(event.contentOffset.y);
    },
    onEndDrag: event => {
      setScrollY(event.contentOffset.y);
    },
    onMomentumEnd: event => {
      setScrollY(event.contentOffset.y);
    },
  });

  useAnimatedReaction(
    () => activeAssetView.value,
    (current, previous) => {
      if (previous === undefined) return;
      if (current === previous) return;
      scrollYRaw.value = 0;
    },
    [],
  );

  useAnimatedReaction(
    () => activeAccountIndex.value,
    (current, previous) => {
      if (previous === undefined) return;
      if (current === previous) return;
      scrollYRaw.value = 0;
    },
    [],
  );

  const headerTranslateY = useDerivedValue(() => {
    const topLockThreshold = baseTopLockThreshold;
    const y = Math.max(0, scrollY.value);
    const effectiveScroll = Math.max(0, y - topLockThreshold);
    const maxTranslate = headerHeight + headerTopInset;
    const clamped = Math.min(maxTranslate, effectiveScroll);
    return -Math.round(clamped * pixelRatio) / pixelRatio;
  }, [headerHeight, headerTopInset]);

  const animatedContainerStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateY: headerTranslateY.value }],
    }),
    [headerTranslateY],
  );

  return {
    scrollHandler,
    animatedContainerStyle,
    activeAssetView,
    activeAccountIndex,
  };
};
