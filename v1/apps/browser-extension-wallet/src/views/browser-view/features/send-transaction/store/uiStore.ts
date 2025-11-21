import create, { UseStore } from 'zustand';
import { ASSET_COMPONENTS } from '@lace/core';
import { FormOptions, Sections } from '../types';
import { createSectionsStore, SectionsStore, useDrawer } from '@src/views/browser-view/stores';
import { sectionsConfig, sharedWalletCoSignSectionsConfig } from '../constants';
import { DrawerContent } from '@views/browser/components/Drawer';

interface UIStore {
  isWarningModalVisible: boolean;
  formPickedOption: FormOptions;
  setFormType: (option: FormOptions) => void;
  setWarnigModalVisibility: (arg: boolean) => void;
  resetUiStates: () => void;
  setOverlaySection: (section: ASSET_COMPONENTS) => void;
  overlaySection?: ASSET_COMPONENTS;
}

const initialState = {
  isWarningModalVisible: false,
  formPickedOption: FormOptions.SIMPLE
};

// ====== store ======

const useStore = create<UIStore>((set) => ({
  ...initialState,
  setWarnigModalVisibility: (visible: boolean) => set({ isWarningModalVisible: visible }),
  resetUiStates: () => set((state) => ({ ...state, ...initialState })),
  setFormType: (option) => set({ formPickedOption: option }),
  setOverlaySection: (section) => set({ overlaySection: section })
}));

// ====== Selectors ======

const useSendTransactionSectionsStore = createSectionsStore<Sections>({
  section: sectionsConfig[Sections.FORM],
  config: sectionsConfig
});

const useSharedWalletCoSignSectionsStore = createSectionsStore<Sections>({
  section: sharedWalletCoSignSectionsConfig[Sections.IMPORT_SHARED_WALLET_TRANSACTION_JSON],
  config: sharedWalletCoSignSectionsConfig
});

export type UseSections = () => Pick<
  SectionsStore<Sections>,
  'currentSection' | 'setPrevSection' | 'setSection' | 'resetSection'
>;

const makeUseSections =
  (store: UseStore<SectionsStore<Sections>>): UseSections =>
  () =>
    store(({ currentSection, setSection, setPrevSection, resetSection }) => ({
      currentSection,
      setSection,
      setPrevSection,
      resetSection
    }));

const useSendTransactionSections = makeUseSections(useSendTransactionSectionsStore);

const useSharedWalletCoSignSections = makeUseSections(useSharedWalletCoSignSectionsStore);

export const getTransactionSectionsHook = (drawerContent?: DrawerContent): UseSections => {
  const hooksMap: Record<DrawerContent.SEND_TRANSACTION | DrawerContent.CO_SIGN_TRANSACTION, UseSections> = {
    [DrawerContent.SEND_TRANSACTION]: useSendTransactionSections,
    [DrawerContent.CO_SIGN_TRANSACTION]: useSharedWalletCoSignSections
  };

  return hooksMap[
    drawerContent === DrawerContent.SEND_TRANSACTION || drawerContent === DrawerContent.CO_SIGN_TRANSACTION
      ? drawerContent
      : DrawerContent.SEND_TRANSACTION
  ];
};

export const useSections: UseSections = () => {
  const [config] = useDrawer();
  const useTransactionSections = getTransactionSectionsHook(config?.content);
  return useTransactionSections();
};

export const useWarningModal = (): [UIStore['isWarningModalVisible'], UIStore['setWarnigModalVisibility']] =>
  useStore((state) => [state.isWarningModalVisible, state.setWarnigModalVisibility]);

export const useResetUiStore = (): UIStore['resetUiStates'] => useStore((state) => state.resetUiStates);

export const useFormPickedOption = (): [UIStore['formPickedOption'], UIStore['setFormType']] =>
  useStore((state) => [state.formPickedOption, state.setFormType]);

export const useAssetOverlaySection = (): [UIStore['overlaySection'], UIStore['setOverlaySection']] =>
  useStore((state) => [state?.overlaySection, state.setOverlaySection]);

export { useStore as sendTransactionUiStore };
