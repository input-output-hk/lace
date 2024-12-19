import { RuleLengthArray } from '../../global/styles/Themes/Mixins/types';

export type TColorsProps =
  | 'primary'
  | 'secondary'
  | 'dark'
  | 'primary-purple'
  | 'light'
  | 'error'
  | 'lilac'
  | 'feedback'
  | 'black'
  | 'secondary-purple'
  | 'heading';

interface IFontStyles {
  smallest?: boolean;
  smaller?: boolean;
  small?: boolean;
  xMedium?: boolean;
  xxMedium?: boolean;
  medium?: boolean;
  big?: boolean;
}

type TFontSizes = Partial<Record<keyof IFontStyles, boolean>>;

export interface ITypographyProps extends TFontSizes {
  id?: HTMLElement['id'];
  className?: HTMLElement['className'] | Record<string, unknown>;
  style?: Partial<HTMLElement['style']>;
  onClick?: React.DOMAttributes<any>['onClick'];
  as?: keyof Pick<
    React.ReactHTML,
    'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'caption' | 'b' | 'pre' | 'div' | 'label'
  >;
  bold?: boolean;
  normal?: boolean;
  center?: boolean;
  cursor?: boolean;
  spacer?: number;
  uppercase?: boolean;
  margin?: RuleLengthArray;
  altColor?: any;
  color?: TColorsProps;
  justify?: boolean;
  children: any;
}
