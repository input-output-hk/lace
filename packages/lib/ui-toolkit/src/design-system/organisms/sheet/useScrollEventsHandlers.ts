import type { NativeScrollEvent } from 'react-native';

import {
  ANIMATION_STATUS,
  SCROLLABLE_STATUS,
  SHEET_STATE,
  useBottomSheetInternal,
  type ScrollEventsHandlersHookType,
} from '@gorhom/bottom-sheet';
import { useCallback } from 'react';
import { State } from 'react-native-gesture-handler';
import { scrollTo } from 'react-native-reanimated';

type ScrollEventContext = {
  initialContentOffsetY: number;
  shouldLockInitialPosition: boolean;
};

/**
 * Drop-in replacement for gorhom's useScrollEventsHandlersDefault that prevents
 * an infinite recursion bug in v5.2.x where calling scrollTo() inside the onScroll
 * worklet (when SCROLLABLE_STATUS.LOCKED) fires another scroll event immediately,
 * causing a stack overflow. Guard: only call scrollTo when the scroll position
 * actually needs to change.
 *
 * TODO: Remove once upstream fixes the bug.
 * @see https://github.com/gorhom/react-native-bottom-sheet/issues/2619
 */
export const useScrollEventsHandlers: ScrollEventsHandlersHookType = (
  scrollableRef,
  scrollableContentOffsetY,
) => {
  const {
    animatedSheetState,
    animatedScrollableState,
    animatedScrollableStatus,
    animatedAnimationState,
    animatedHandleGestureState,
  } = useBottomSheetInternal();

  const handleOnScroll = useCallback(
    (
      { contentOffset: { y } }: NativeScrollEvent,
      context: ScrollEventContext,
    ) => {
      'worklet';
      if (
        animatedSheetState.value === SHEET_STATE.EXTENDED ||
        animatedSheetState.value === SHEET_STATE.FILL_PARENT
      ) {
        context.shouldLockInitialPosition = false;
      }

      if (animatedHandleGestureState.value === State.ACTIVE) {
        context.shouldLockInitialPosition = true;
        context.initialContentOffsetY = y;
      }

      if (animatedScrollableStatus.value === SCROLLABLE_STATUS.LOCKED) {
        const lockPosition = context.shouldLockInitialPosition
          ? context.initialContentOffsetY ?? 0
          : 0;
        // Guard: only call scrollTo if position needs to change.
        // Without this check, scrollTo fires another onScroll event with y=lockPosition,
        // which calls scrollTo again, causing an infinite loop (stack overflow crash).
        if (y !== lockPosition) {
          // @ts-expect-error scrollTo expects AnimatedRef but gorhom passes a regular ref
          scrollTo(scrollableRef, 0, lockPosition, false);
        }
        scrollableContentOffsetY.value = lockPosition;
        return;
      }
    },
    [
      scrollableRef,
      scrollableContentOffsetY,
      animatedScrollableStatus,
      animatedSheetState,
      animatedHandleGestureState,
    ],
  );

  const handleOnBeginDrag = useCallback(
    (
      { contentOffset: { y } }: NativeScrollEvent,
      context: ScrollEventContext,
    ) => {
      'worklet';
      scrollableContentOffsetY.value = y;
      context.initialContentOffsetY = y;
      animatedScrollableState.set(state => ({
        ...state,
        contentOffsetY: y,
      }));

      if (
        animatedSheetState.value !== SHEET_STATE.EXTENDED &&
        animatedSheetState.value !== SHEET_STATE.FILL_PARENT &&
        y > 0
      ) {
        context.shouldLockInitialPosition = true;
      } else {
        context.shouldLockInitialPosition = false;
      }
    },
    [scrollableContentOffsetY, animatedSheetState, animatedScrollableState],
  );

  const handleOnEndDrag = useCallback(
    (
      { contentOffset: { y } }: NativeScrollEvent,
      context: ScrollEventContext,
    ) => {
      'worklet';
      if (animatedScrollableStatus.value === SCROLLABLE_STATUS.LOCKED) {
        const lockPosition = context.shouldLockInitialPosition
          ? context.initialContentOffsetY ?? 0
          : 0;
        if (y !== lockPosition) {
          // @ts-expect-error scrollTo expects AnimatedRef but gorhom passes a regular ref
          scrollTo(scrollableRef, 0, lockPosition, false);
        }
        scrollableContentOffsetY.value = lockPosition;
        return;
      }

      if (animatedAnimationState.get().status !== ANIMATION_STATUS.RUNNING) {
        scrollableContentOffsetY.value = y;
        animatedScrollableState.set(state => ({
          ...state,
          contentOffsetY: y,
        }));
      }
    },
    [
      scrollableRef,
      scrollableContentOffsetY,
      animatedAnimationState,
      animatedScrollableStatus,
      animatedScrollableState,
    ],
  );

  const handleOnMomentumEnd = useCallback(
    (
      { contentOffset: { y } }: NativeScrollEvent,
      context: ScrollEventContext,
    ) => {
      'worklet';
      if (animatedScrollableStatus.value === SCROLLABLE_STATUS.LOCKED) {
        const lockPosition = context.shouldLockInitialPosition
          ? context.initialContentOffsetY ?? 0
          : 0;
        if (y !== lockPosition) {
          // @ts-expect-error scrollTo expects AnimatedRef but gorhom passes a regular ref
          scrollTo(scrollableRef, 0, lockPosition, false);
        }
        scrollableContentOffsetY.value = lockPosition;
        return;
      }

      if (animatedAnimationState.get().status !== ANIMATION_STATUS.RUNNING) {
        scrollableContentOffsetY.value = y;
        animatedScrollableState.set(state => ({
          ...state,
          contentOffsetY: y,
        }));
      }
    },
    [
      scrollableRef,
      scrollableContentOffsetY,
      animatedAnimationState,
      animatedScrollableStatus,
      animatedScrollableState,
    ],
  );

  return {
    handleOnScroll,
    handleOnBeginDrag,
    handleOnEndDrag,
    handleOnMomentumEnd,
  };
};
