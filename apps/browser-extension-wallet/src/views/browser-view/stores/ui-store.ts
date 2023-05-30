import create from 'zustand';
import { DrawerConfig } from '@views/browser/components/Drawer';

interface UIStore {
  drawerContent?: DrawerConfig | undefined;
  setDrawerConfig: (args?: DrawerConfig) => void;
}

// ====== store ======

const useStore = create<UIStore>((set) => ({
  setDrawerConfig: (content?: UIStore['drawerContent']) => set({ drawerContent: content })
}));

// ====== Selectors ======

export const useDrawer = (): [UIStore['drawerContent'], UIStore['setDrawerConfig']] =>
  useStore((state) => [state.drawerContent, state.setDrawerConfig]);

export const useDrawerContentOption = (): DrawerConfig['options'] => useStore((state) => state?.drawerContent?.options);
