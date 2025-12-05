import create from 'zustand';
import { StakePoolDetails, Sections, SimpleSectionsConfig, SectionConfig, StakingError } from '../types';

export const sectionsConfig: SimpleSectionsConfig = {
  [Sections.DETAIL]: {
    currentSection: Sections.DETAIL,
    nextSection: Sections.CONFIRMATION
  },
  [Sections.CONFIRMATION]: {
    currentSection: Sections.CONFIRMATION,
    nextSection: Sections.SIGN,
    prevSection: Sections.DETAIL
  },
  [Sections.SIGN]: {
    currentSection: Sections.SIGN,
    prevSection: Sections.CONFIRMATION
  },
  [Sections.SUCCESS_TX]: {
    currentSection: Sections.SUCCESS_TX,
    prevSection: Sections.SIGN
  },
  [Sections.FAIL_TX]: {
    currentSection: Sections.FAIL_TX,
    prevSection: Sections.SIGN
  }
};

const storeDefaultState: Pick<StakePoolDetails, 'simpleSendConfig'> = {
  simpleSendConfig: sectionsConfig[Sections.DETAIL]
};

/**
 * returns a hook to access stake pool details store visibility states and setters
 */
export const useStakePoolDetails = create<StakePoolDetails>((set, get) => ({
  ...storeDefaultState,
  setSection: (section: SectionConfig) =>
    set({ simpleSendConfig: section ?? sectionsConfig[get().simpleSendConfig.nextSection] }),
  setPrevSection: () => set({ simpleSendConfig: sectionsConfig[get().simpleSendConfig.prevSection] }),
  resetStates: () => set((state: StakePoolDetails) => ({ ...state, ...storeDefaultState })),
  isDrawerVisible: false,
  setIsDrawerVisible: (visibility: boolean) => set({ isDrawerVisible: visibility }),
  isStakeConfirmationVisible: false,
  setStakeConfirmationVisible: (visibility: boolean) => set({ isStakeConfirmationVisible: visibility }),
  isExitStakingVisible: false,
  setExitStakingVisible: (visibility: boolean) => set({ isExitStakingVisible: visibility }),
  isNoFundsVisible: false,
  setNoFundsVisible: (visibility: boolean) => set({ isNoFundsVisible: visibility }),
  isBuildingTx: false,
  setIsBuildingTx: (visibility: boolean) => set({ isBuildingTx: visibility }),
  stakingError: undefined,
  setStakingError: (error: StakingError | undefined) => set({ stakingError: error })
}));
