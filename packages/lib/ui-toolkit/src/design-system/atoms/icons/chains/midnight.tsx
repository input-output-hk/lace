import React from 'react';
import { Svg, Path } from 'react-native-svg';

import { useTheme } from '../../../../design-tokens';

import type { CustomIconProps } from '../customIcons';

export const Midnight = ({
  size,
  width = size || 25,
  height = size || 25,
  style = { backgroundColor: 'transparent' },
  ...props
}: CustomIconProps) => {
  const { theme } = useTheme();

  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 25 24"
      fill="none"
      style={style}
      {...props}>
      <Path
        d="M12.0617 0.461533C5.40037 0.461533 0 5.6542 0 12.0593C0 18.4645 5.40037 23.6572 12.0617 23.6572C18.7231 23.6572 24.1235 18.4645 24.1235 12.0593C24.1235 5.6542 18.7231 0.461533 12.0617 0.461533ZM12.0617 21.5182C6.63742 21.5182 2.22443 17.275 2.22443 12.0593C2.22443 6.84367 6.63672 2.59973 12.0617 2.59973C17.4867 2.59973 21.8989 6.843 21.8989 12.0586C21.8989 17.2743 17.486 21.5182 12.0617 21.5182Z"
        fill={theme.text.primary}
      />
      <Path
        d="M13.1938 10.9706H10.9294V13.1479H13.1938V10.9706Z"
        fill={theme.text.primary}
      />
      <Path
        d="M13.1938 7.53336H10.9294V9.71077H13.1938V7.53336Z"
        fill={theme.text.primary}
      />
      <Path
        d="M13.1938 4.09616H10.9294V6.27358H13.1938V4.09616Z"
        fill={theme.text.primary}
      />
    </Svg>
  );
};
