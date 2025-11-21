/* eslint-disable no-magic-numbers */
import { PaddingEnum } from './enum';
import { IPadding } from './types';

/**
 * Default padding size: 8
 */
export const padding: IPadding['padding'] = {
  smallest: PaddingEnum.SMALLEST,
  small: PaddingEnum.SMALLEST * 2,
  medium: PaddingEnum.SMALLEST * 3,
  large: PaddingEnum.SMALLEST * 4
};
