import { IColors } from '../../global/styles/Themes/Colors/types';
import { LinkProps } from 'react-router-dom';
import { RuleLengthArray } from '../../global/styles/Themes/Mixins/types';

export interface ILink extends LinkProps {
  spacer?: number;
  margin?: RuleLengthArray;
  disabled?: boolean;
  badgeColor?: string | boolean;
  color?: keyof IColors['colors'];
}
