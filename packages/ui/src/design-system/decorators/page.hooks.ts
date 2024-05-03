import { usePageContext } from './page.context';

import type { PageContextValue } from './page.context';

/**
 * **Important**: This is for Storybook use only. In real app everything will be placed in context of a single
 * ThemeProvider. It should be used with all components that create portals to fix LocalThemeProvider with dark theme
 * and Interaction tests (without this approach your component may not be accessible using `canvas.getByTestId()`).
 */
export const usePortalContainer = (): Pick<
  PageContextValue,
  'darkThemePortalContainer' | 'lightThemePortalContainer'
> => {
  const { lightThemePortalContainer, darkThemePortalContainer } =
    usePageContext();

  return {
    darkThemePortalContainer,
    lightThemePortalContainer,
  };
};
