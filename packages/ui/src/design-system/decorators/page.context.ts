import { createContext, useContext } from 'react';

interface PageContextValue {
  portalContainer?: HTMLElement;
  setPortalContainer: (container: Readonly<HTMLElement>) => void;
}

export const PageContext = createContext<PageContextValue>({
  portalContainer: undefined,
  setPortalContainer: () => false,
});

export const usePageContext = (): PageContextValue => {
  const context = useContext(PageContext);
  return context;
};
