import React from 'react';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '../../../design-tokens';

import type { SvgProps } from 'react-native-svg';

export const LockCheck = ({ width = 22, height = 22, ...props }: SvgProps) => {
  const { theme } = useTheme();
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 22 22"
      fill="none"
      {...props}>
      <Path
        d="M13 19C13 19 14 19 15 21C15 21 18.1765 16 21 15"
        stroke={theme.text.primary}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M17 13C16.9505 12.3775 16.8765 11.7622 16.7944 11.1553C16.5686 9.48502 15.1797 8.17649 13.4896 8.09909C12.0673 8.03397 10.6226 8 9.03165 8C7.44068 8 5.99596 8.03397 4.57374 8.09909C2.88355 8.17649 1.49464 9.48502 1.26887 11.1553C1.12152 12.2453 1 13.3624 1 14.5C1 15.6376 1.12152 16.7547 1.26887 17.8447C1.49464 19.515 2.88355 20.8235 4.57374 20.9009C5.99596 20.966 7.44068 21 9.03164 21C9.5344 21 10.0225 20.9966 10.5 20.9899"
        stroke={theme.text.primary}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <Path
        d="M4.5 8V5.5C4.5 3.01472 6.51472 1 9 1C11.4853 1 13.5 3.01472 13.5 5.5V8"
        stroke={theme.text.primary}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};
