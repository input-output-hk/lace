import { useTheme } from '../../../design-tokens';

import type { ColorType } from '../commons';

export const useColor = () => {
  const { theme } = useTheme();

  const {
    background: { negative, primary: white, secondary, positive },
    brand: { yellowSecondary, support, ascending, black },
  } = theme;

  const backgroundColorMap: Record<ColorType, string> = {
    black,
    negative,
    neutral: yellowSecondary,
    positive,
    primary: ascending,
    secondary: support,
    white,
    lightGray: secondary,
  };

  return {
    backgroundColorMap,
  };
};
