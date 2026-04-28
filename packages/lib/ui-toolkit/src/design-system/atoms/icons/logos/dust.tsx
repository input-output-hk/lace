import React from 'react';
import { Svg, Path, Rect } from 'react-native-svg';

import { useTheme } from '../../../../design-tokens';

import type { CustomIconProps } from '../customIcons';

export const Dust = ({
  size,
  width = size || 24,
  height = size || 24,
  ...props
}: CustomIconProps) => {
  const { theme } = useTheme();
  const defaultFillColor = theme.text.primary;
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      {...props}>
      <Rect x="3" y="3" width="4" height="4" fill={defaultFillColor} />
      <Rect x="3" y="10" width="4" height="4" fill={defaultFillColor} />
      <Rect x="3" y="17" width="4" height="4" fill={defaultFillColor} />
      <Path
        d="M12.8765 7H7V3.05761C13.5 3.05761 21 1.71441 21 11.9994C21 22.2845 14.2593 20.943 10.4074 20.9421V16.4708H12.8148C13.9383 16.4708 16.1852 16.9188 16.1852 11.9994C16.1852 7.52808 14 7 12.8765 7Z"
        fill={defaultFillColor}
      />
    </Svg>
  );
};
