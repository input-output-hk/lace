import { usePageContext } from './page.context';

export const usePortalContainer = (): Element | undefined =>
  usePageContext().portalContainer;
