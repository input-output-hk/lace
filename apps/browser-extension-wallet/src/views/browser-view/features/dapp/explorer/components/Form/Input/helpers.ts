import { TColorsProps } from '../../Typography/types';
import { IInputProps } from './types';

export const requireMessageTextColor = ({ light }: Pick<IInputProps, 'light'>): TColorsProps => {
  if (light) return 'dark';
  return 'lilac';
};
