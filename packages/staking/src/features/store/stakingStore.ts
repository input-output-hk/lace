import { create } from 'zustand';
import { Page, StakePoolDetails, StakingError } from './types';

/**
 * returns a hook to access stake pool details store visibility states and setters
 */
export const useStakePoolDetails = create<StakePoolDetails>((set) => ({
  activePage: Page.overview,
  isBuildingTx: false,
  isExitStakingVisible: false,
  isNoFundsVisible: false,
  isStakeConfirmationVisible: false,
  resetStates: () => set((state: StakePoolDetails) => ({ ...state })),
  setActivePage: (activePage) => set({ activePage }),
  setExitStakingVisible: (visibility: boolean) => set({ isExitStakingVisible: visibility }),
  setIsBuildingTx: (visibility: boolean) => set({ isBuildingTx: visibility }),
  setNoFundsVisible: (visibility: boolean) => set({ isNoFundsVisible: visibility }),
  setStakeConfirmationVisible: (visibility: boolean) => set({ isStakeConfirmationVisible: visibility }),
  setStakingError: (error: StakingError | undefined) => set({ stakingError: error }),
  stakingError: undefined,
}));
