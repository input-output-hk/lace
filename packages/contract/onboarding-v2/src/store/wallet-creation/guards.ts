const createConcurrencyGuard = () => {
  const state = { isInProgress: false };

  return {
    tryAcquire: (): boolean => {
      if (state.isInProgress) return false;
      state.isInProgress = true;
      return true;
    },
    release: (): void => {
      state.isInProgress = false;
    },
    isActive: (): boolean => state.isInProgress,
    reset: (): void => {
      state.isInProgress = false;
    },
  };
};

export const preAuthGuard = createConcurrencyGuard();

export const walletCreationGuard = createConcurrencyGuard();

/**
 * Reset all guards. Used in tests to ensure clean state.
 */
export const resetGuards = (): void => {
  walletCreationGuard.reset();
  preAuthGuard.reset();
};
