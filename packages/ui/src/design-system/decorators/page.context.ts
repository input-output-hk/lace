import { createContext, useContext } from 'react';

interface PageContextValue {
  portalContainer?: Element;
  setPortalContainer: (container: Readonly<Element>) => void;
}

export const PageContext = createContext<PageContextValue>({
  portalContainer: undefined,
  setPortalContainer: () => false,
});

export const usePageContext = (): PageContextValue => {
  const context = useContext(PageContext);
  return context;
};
