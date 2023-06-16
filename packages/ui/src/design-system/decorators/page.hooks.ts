import { usePageContext } from './page.context';

export const usePortalContainer = (): HTMLElement | undefined =>
  usePageContext().portalContainer;
