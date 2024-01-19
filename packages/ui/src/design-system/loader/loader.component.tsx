import React from 'react';

import { ReactComponent as LoaderDarkIcon } from '@lace/icons/dist/LoaderDarkGradientComponent';
import { ReactComponent as LoaderLightIcon } from '@lace/icons/dist/LoaderLightGradientComponent';
import cn from 'classnames';

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
