import { usePageContext } from './page.context';

export const useDarkThemePortalContainer = (): HTMLElement | undefined =>
  usePageContext().portalContainer;
