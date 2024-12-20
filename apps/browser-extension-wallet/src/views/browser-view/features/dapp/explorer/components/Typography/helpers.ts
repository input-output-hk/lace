import { TColorsProps } from './types';

export const getFontColor = (color: TColorsProps): Record<string, boolean> => ({
  [`iog-font--${color}`]: true
});
