import React from 'react';

import cn from 'classnames';

import { ReactComponent as LoaderDarkIcon } from '../../assets/icons/loader-dark-gradient.component.svg';
import { ReactComponent as LoaderLightIcon } from '../../assets/icons/loader-light-gradient.component.svg';
import { ThemeColorScheme, sx, useTheme } from '../../design-tokens';
import { Flex } from '../flex';

import * as cx from './loader.css';

import type { BoxProps } from '../box';

export const Loader = ({
  w = '$148',
  h = '$148',
  ...props
}: Readonly<BoxProps>): JSX.Element => {
  const { colorScheme } = useTheme();

  const LoaderIcon =
    colorScheme === ThemeColorScheme.Dark ? LoaderDarkIcon : LoaderLightIcon;

  return (
    <Flex {...props} h={h} w={w}>
      <LoaderIcon
        className={cn(
          sx({
            h,
            w,
          }),
          cx.spin,
        )}
      />
    </Flex>
  );
};
