import create from 'zustand';
import { ASSET_COMPONENTS } from '@lace/core';
import { SectionConfig, FormOptions } from '../types';
import { sectionsConfig } from '../constants';

interface UIStore {
  isDrawerVisible: boolean;
  setIsDrawerVisible: (visibility: boolean) => void;
  currentSection: SectionConfig;
  setSection: (section?: SectionConfig) => void;
  isWarningModalVisible: boolean;

  formPickedOption: FormOptions;
  setFormType: (option: FormOptions) => void;

  setWarnigModalVisibility: (arg: boolean) => void;
  setPrevSection: () => void;
  resetUiStates: () => void;

  setOverlaySection: (section: ASSET_COMPONENTS) => void;
  overlaySection?: ASSET_COMPONENTS;
}

const initialState = {
  isDrawerVisible: false,
  currentSection: sectionsConfig.form,
  isWarningModalVisible: false,
  formPickedOption: FormOptions.SIMPLE
};

// ====== store ======

const useStore = create<UIStore>((set, get) => ({
  ...initialState,
  setIsDrawerVisible: (visibility: boolean) => set({ isDrawerVisible: visibility }),
  setSection: (section) => set({ currentSection: section ?? sectionsConfig[get().currentSection.nextSection] }),
  setWarnigModalVisibility: (visible: boolean) => set({ isWarningModalVisible: visible }),
  setPrevSection: () => set({ currentSection: sectionsConfig[get().currentSection.prevSection] }),
  resetUiStates: () => set((state) => ({ ...state, ...initialState })),
  setFormType: (option) => set({ formPickedOption: option }),
  setOverlaySection: (section) => set({ overlaySection: section })
}));

// ====== Selectors ======

export const useDrawer = (): [UIStore['isDrawerVisible'], UIStore['setIsDrawerVisible']] =>
  useStore((state) => [state.isDrawerVisible, state.setIsDrawerVisible]);

export const useSections = (): Pick<UIStore, 'currentSection' | 'setPrevSection' | 'setSection'> =>
  useStore(({ currentSection, setSection, setPrevSection }) => ({ currentSection, setSection, setPrevSection }));

export const useWarningModal = (): [UIStore['isWarningModalVisible'], UIStore['setWarnigModalVisibility']] =>
  useStore((state) => [state.isWarningModalVisible, state.setWarnigModalVisibility]);

export const useResetUiStore = (): UIStore['resetUiStates'] => useStore((state) => state.resetUiStates);

export const useFormPickedOption = (): [UIStore['formPickedOption'], UIStore['setFormType']] =>
  useStore((state) => [state.formPickedOption, state.setFormType]);

export const useAssetOverlaySection = (): [UIStore['overlaySection'], UIStore['setOverlaySection']] =>
  useStore((state) => [state?.overlaySection, state.setOverlaySection]);

export { useStore as sendTransactionUiStore };
