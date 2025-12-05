import { IPadding } from './Padding/types';
import { IGrid } from './Grid/types';
import { IShadow } from './Shadow/types';
import { IBorder } from './Border/types';
import { IOpacity } from './Opacity/types';
import { IFonts } from './Fonts/types';
import { IColors } from './Colors/types';
import { IContainer } from './Container/types';
import { IMixins } from './Mixins/types';

export interface ITheme extends IColors, IFonts, IOpacity, IBorder, IShadow, IGrid, IContainer, IPadding, IMixins {}

export interface IThemeStyledProps {
  theme: ITheme;
}
