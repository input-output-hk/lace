import create from 'zustand';
import { Page, SectionConfig, Sections, StakePoolDetails, StakingError } from './types';

export const sectionsConfig = {
  [Sections.DETAIL]: {
    currentSection: Sections.DETAIL,
    nextSection: Sections.PREFERENCES,
  },
  [Sections.PREFERENCES]: {
    currentSection: Sections.PREFERENCES,
    nextSection: Sections.CONFIRMATION,
    prevSection: Sections.DETAIL,
  },
  [Sections.CONFIRMATION]: {
    currentSection: Sections.CONFIRMATION,
    nextSection: Sections.SIGN,
    prevSection: Sections.PREFERENCES,
  },
  [Sections.SIGN]: {
    currentSection: Sections.SIGN,
    prevSection: Sections.CONFIRMATION,
  },
  [Sections.SUCCESS_TX]: {
    currentSection: Sections.SUCCESS_TX,
    prevSection: Sections.SIGN,
  },
  [Sections.FAIL_TX]: {
    currentSection: Sections.FAIL_TX,
    prevSection: Sections.SIGN,
  },
} as const;

const storeDefaultState: Pick<StakePoolDetails, 'simpleSendConfig'> = {
  simpleSendConfig: sectionsConfig[Sections.DETAIL],
};

/**
 * returns a hook to access stake pool details store visibility states and setters
 */
export const useStakePoolDetails = create<StakePoolDetails>((set, get) => ({
  ...storeDefaultState,
  activePage: Page.overview,
  isBuildingTx: false,
  isDrawerVisible: false,
  isExitStakingVisible: false,
  isNoFundsVisible: false,
  isStakeConfirmationVisible: false,
  resetStates: () => set((state: StakePoolDetails) => ({ ...state, ...storeDefaultState })),
  setActivePage: (activePage) => set({ activePage }),
  setExitStakingVisible: (visibility: boolean) => set({ isExitStakingVisible: visibility }),
  setIsBuildingTx: (visibility: boolean) => set({ isBuildingTx: visibility }),
  setIsDrawerVisible: (visibility: boolean) => set({ isDrawerVisible: visibility }),
  setNoFundsVisible: (visibility: boolean) => set({ isNoFundsVisible: visibility }),
  setPrevSection: () => {
    const { currentSection, prevSection } = get().simpleSendConfig;
    if (!prevSection) {
      console.error(`Tried to move to not existing section (previous of ${currentSection})`);
      return;
    }
    set({ simpleSendConfig: sectionsConfig[prevSection] });
  },
  setSection: (section?: SectionConfig) => {
    if (section) {
      set({ simpleSendConfig: section });
      return;
    }

    const { currentSection, nextSection } = get().simpleSendConfig;
    if (!nextSection) {
      console.error(`useStakePoolDetails::setSection: missing nextSection config for section: "${currentSection}"`);
      return;
    }

    set({ simpleSendConfig: sectionsConfig[nextSection] });
  },
  setStakeConfirmationVisible: (visibility: boolean) => set({ isStakeConfirmationVisible: visibility }),
  setStakingError: (error: StakingError | undefined) => set({ stakingError: error }),
  stakingError: undefined,
}));
