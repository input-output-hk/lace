import * as React from 'react';
import getIconMetaData from './data';
import { EIconsTypes } from './enum';
import SvgIcon from './svg';
import { IIcon, ISvgIcon, TIconCreator } from './types';

const { memo } = React;

const ICON_SIZES = {
  LARGE: 36,
  SMALL: 18,
  DEFAULT: 24
};

const getSizeValue = (size: ISvgIcon['size']): number => {
  switch (size) {
    case 'large':
      return ICON_SIZES.LARGE;
    case 'small':
      return ICON_SIZES.SMALL;
    default:
      return ICON_SIZES.DEFAULT;
  }
};

const iconCreator = (props: TIconCreator) => {
  const { family, name, type, size, svgPathKey, ...otherProps } = props;

  const svgIconsProps = {
    svgPathKey,
    size: getSizeValue(size),
    ...otherProps
  };

  switch (type) {
    case EIconsTypes.ICON:
      return <></>;
    case EIconsTypes.SVG:
      return <SvgIcon {...svgIconsProps} />;
    default:
      return <></>;
  }
};

const Component: React.FC<IIcon> = (props) => {
  const { name, ...otherProps } = props;
  const iconMetaData = getIconMetaData(name);

  return iconCreator({ ...otherProps, ...iconMetaData });
};

export { EIconsName } from './enum';
export const Icon = memo(Component);
