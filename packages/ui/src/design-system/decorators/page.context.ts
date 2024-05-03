import { createContext, useContext } from 'react';

interface PageContextValue {
  darkThemePortalContainer?: HTMLElement;
  lightThemePortalContainer?: HTMLElement;
  setPortalContainers: ({
    lightTheme,
    darkTheme,
  }: Readonly<{ lightTheme: HTMLElement; darkTheme: HTMLElement }>) => void;
}

export const PageContext = createContext<PageContextValue>({
  darkThemePortalContainer: undefined,
  lightThemePortalContainer: undefined,
  setPortalContainers: () => void 0,
});

export const usePageContext = (): PageContextValue => useContext(PageContext);
