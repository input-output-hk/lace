import { ImageProps } from 'antd';
import { RuleLengthArray } from '../../global/styles/Themes/Mixins/types';

export interface IogImageProps extends ImageProps {
  spacer?: number;
  margin?: RuleLengthArray;
  width?: number;
  height?: number;
  size?: number;
  fluid?: boolean;
  // onClick?: React.DOMAttributes<unknown>['onClick'];
  overflow?: boolean;
  circle?: boolean;
  fit?: React.CSSProperties['objectFit'];
  className?: any;
  // onMouseOver?: React.DOMAttributes<unknown>['onMouseOver'];
  // onMouseLeave?: React.DOMAttributes<unknown>['onMouseLeave'];
}
