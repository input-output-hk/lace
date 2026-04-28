import { InteractionManager } from 'react-native';

export type ScheduleNativeListScrollToTopHandle = {
  cancel: () => void;
};

/** Same delay as `dropdownMenu` post-interaction measure scheduling — lets native layout settle. */
const LAYOUT_SETTLE_MS = 50;

/**
 * Defers `scrollToTop` until after interactions, a short timeout, and the next paint.
 * Dual `requestAnimationFrame` alone can still run while FlashList/ScrollView is re-measuring;
 * `InteractionManager.runAfterInteractions` + `setTimeout` matches other timing-sensitive UI here.
 */
export const scheduleNativeListScrollToTop = (
  scrollToTop: () => void,
): ScheduleNativeListScrollToTopHandle => {
  let isCancelled = false;
  let interactionTask: { cancel: () => void } | null = null;
  let settleTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let rafId: number | null = null;

  const runScroll = () => {
    rafId = null;
    if (!isCancelled) {
      scrollToTop();
    }
  };

  const afterSettleDelay = () => {
    settleTimeoutId = null;
    if (isCancelled) {
      return;
    }
    rafId = requestAnimationFrame(runScroll);
  };

  const afterInteractions = () => {
    if (isCancelled) {
      return;
    }
    settleTimeoutId = setTimeout(afterSettleDelay, LAYOUT_SETTLE_MS);
  };

  // Must pass a function task: when `disableInteractionManager` is on, RN uses `InteractionManagerStub`,
  // which throws `Invalid task of type: undefined` for `runAfterInteractions()` with no argument.
  const handle = InteractionManager.runAfterInteractions(() => {
    afterInteractions();
  });
  interactionTask = handle;

  return {
    cancel: () => {
      isCancelled = true;
      interactionTask?.cancel();
      interactionTask = null;
      if (settleTimeoutId !== null) {
        clearTimeout(settleTimeoutId);
        settleTimeoutId = null;
      }
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
  };
};
