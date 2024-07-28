import create from 'zustand';
import { ASSET_COMPONENTS } from '@lace/core';
import { FormOptions, Sections } from '../types';
import { SectionsStore, createSectionsStore } from '@src/views/browser-view/stores';
import { sectionsConfig } from '../constants';

interface UIStore {
  isDrawerVisible: boolean;
  setIsDrawerVisible: (visibility: boolean) => void;
  isWarningModalVisible: boolean;
  formPickedOption: FormOptions;
  setFormType: (option: FormOptions) => void;
  setWarnigModalVisibility: (arg: boolean) => void;
  resetUiStates: () => void;
  setOverlaySection: (section: ASSET_COMPONENTS) => void;
  overlaySection?: ASSET_COMPONENTS;
}

const initialState = {
  isDrawerVisible: false,
  isWarningModalVisible: false,
  formPickedOption: FormOptions.SIMPLE
};

// ====== store ======

const useStore = create<UIStore>((set) => ({
  ...initialState,
  setIsDrawerVisible: (visibility: boolean) => set({ isDrawerVisible: visibility }),
  setWarnigModalVisibility: (visible: boolean) => set({ isWarningModalVisible: visible }),
  resetUiStates: () => set((state) => ({ ...state, ...initialState })),
  setFormType: (option) => set({ formPickedOption: option }),
  setOverlaySection: (section) => set({ overlaySection: section })
}));

// ====== Selectors ======

export const useDrawer = (): [UIStore['isDrawerVisible'], UIStore['setIsDrawerVisible']] =>
  useStore((state) => [state.isDrawerVisible, state.setIsDrawerVisible]);

const useSectionsStore = createSectionsStore<Sections>({
  section: sectionsConfig.form,
  config: sectionsConfig
});

export const useSections = (): Pick<
  SectionsStore<Sections>,
  'currentSection' | 'setPrevSection' | 'setSection' | 'resetSection'
> =>
  useSectionsStore(({ currentSection, setSection, setPrevSection, resetSection }) => ({
    currentSection,
    setSection,
    setPrevSection,
    resetSection
  }));

export const useWarningModal = (): [UIStore['isWarningModalVisible'], UIStore['setWarnigModalVisibility']] =>
  useStore((state) => [state.isWarningModalVisible, state.setWarnigModalVisibility]);

export const useResetUiStore = (): UIStore['resetUiStates'] => useStore((state) => state.resetUiStates);

export const useFormPickedOption = (): [UIStore['formPickedOption'], UIStore['setFormType']] =>
  useStore((state) => [state.formPickedOption, state.setFormType]);

export const useAssetOverlaySection = (): [UIStore['overlaySection'], UIStore['setOverlaySection']] =>
  useStore((state) => [state?.overlaySection, state.setOverlaySection]);

export { useStore as sendTransactionUiStore };
