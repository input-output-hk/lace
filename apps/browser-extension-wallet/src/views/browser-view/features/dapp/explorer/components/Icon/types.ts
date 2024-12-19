import { IColors } from '../../global/styles/Themes/Colors/types';
import { IThemeStyledProps } from '../../global/styles/Themes/types';
import { EIconsName, EIconsTypes } from './enum';
import { SVGAttributes } from 'react';

interface IIconStyle extends Partial<IThemeStyledProps>, Pick<SVGAttributes<any>, 'style'> {
  color?: string;
  strokeColor?: string;
  strokeColorByFill?: boolean;
}

interface IIconRules {
  name: EIconsName;
  size?: 'small' | 'large' | number;
  className?: string;
}

export interface IIcon extends IIconStyle, IIconRules {}

type IconStylePickProperties = 'theme' | 'strokeColorByFill' | 'strokeColor';

interface ICommonIconsMetaDataValue {
  type?: EIconsTypes;
}

export interface ISvgIconsMetaDataValue
  extends ICommonIconsMetaDataValue,
    Pick<IIconRules, 'size'>,
    Pick<IIconStyle, 'style'> {
  defaultStrokeColor?: CSSStyleDeclaration['stroke'];
  svgPathKey?: EIconsName;
  strokeColorByFill?: boolean;
  defaultFill?: keyof IColors['colors'];
  defaultViewBox?: string;
}

export interface ISvgIcon
  extends SVGAttributes<any>,
    Omit<ISvgIconsMetaDataValue, 'type'>,
    Pick<IIconStyle, IconStylePickProperties> {}

export interface IVendorIconsMetaDataValue extends ICommonIconsMetaDataValue {
  family?: any;
  name?: string;
}

export type TIconsMetaData = Map<EIconsName, IVendorIconsMetaDataValue | ISvgIconsMetaDataValue>;

export interface TIconCreator extends Omit<IIcon, 'name'>, IVendorIconsMetaDataValue, ISvgIconsMetaDataValue {}
