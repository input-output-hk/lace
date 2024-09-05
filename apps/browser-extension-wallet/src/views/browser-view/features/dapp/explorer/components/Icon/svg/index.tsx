import classNames from 'classnames';
import React from 'react';
import { ISvgIcon } from '../types';
import getSVGPath from './data';

export const ATOM_ICON_SVG_ID = 'atom-icon-svg';

const SvgIcon: React.FC<ISvgIcon> = (props) => {
  const {
    color,
    defaultFill,
    svgPathKey,
    size,
    style,
    theme,
    strokeColor,
    defaultStrokeColor,
    strokeColorByFill,
    defaultViewBox,
    className = ''
  } = props;
  const viewBox = defaultViewBox ?? '0 0 24 24';

  const fillColor = color ?? style?.color ?? defaultFill ?? theme?.colors.darkGray;

  const strokeDefaultColor = strokeColor ?? defaultStrokeColor ?? (strokeColorByFill && fillColor);

  return (
    <svg
      key={`svg-${svgPathKey}`}
      className={classNames(['iog-icon', className])}
      width={size}
      height={size}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      fill={fillColor}
      stroke={strokeDefaultColor || ''}
    >
      {svgPathKey && getSVGPath(svgPathKey)}
    </svg>
  );
};

export default SvgIcon;
