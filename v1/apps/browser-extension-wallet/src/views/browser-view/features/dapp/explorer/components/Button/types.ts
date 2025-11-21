import { ClassAttributes } from 'react';
import { IIcon } from '../../components/Icon/types';
import { EIconsName } from '../../components/Icon/enum';
import { RuleLengthArray } from '../../global/styles/Themes/Mixins/types';

export interface IButtonStyleType {
  primary?: boolean;
  secondary?: boolean;
  outline?: boolean;
  dark?: boolean;
  addmore?: boolean;
  transparent?: boolean;
  standard?: boolean;
  solid?: boolean;
  tag?: boolean;
  alternative?: boolean;
}

export interface IButtonType {
  circle?: boolean;
  hasBorder?: boolean;
}

export interface IButtonSizes {
  small?: boolean;
}

export interface IogButtonProps
  extends IButtonSizes,
    IButtonStyleType,
    IButtonType,
    React.ButtonHTMLAttributes<HTMLButtonElement> {
  spacer?: number;
  margin?: RuleLengthArray;
  padding?: RuleLengthArray;
  reverse?: boolean;
}
export interface IIogButtonProps extends IogButtonProps {
  icon?: EIconsName;
  iconProps?: Omit<IIcon, 'name'>;
  label?: string;
}
export interface IIogButtonIconProps extends Omit<IogButtonProps, 'theme'> {
  name?: EIconsName;
  iconProps?: Omit<IIcon, 'name'>;
  ref?: ClassAttributes<HTMLButtonElement>['ref'];
}
