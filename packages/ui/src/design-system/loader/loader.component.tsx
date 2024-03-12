/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import type { SVGProps } from 'react';
import React from 'react';

import { ReactComponent as LoaderDarkIcon } from '@lace/icons/dist/LoaderDarkGradientComponent';
import { ReactComponent as LoaderLightIcon } from '@lace/icons/dist/LoaderLightGradientComponent';
import cn from 'classnames';

import { ThemeColorScheme, sx, useTheme } from '../../design-tokens';
import { Flex } from '../flex';

import * as cx from './loader.css';

import type { BoxProps } from '../box';

type Props = Readonly<
  BoxProps & {
    icon?: (props: Readonly<SVGProps<SVGSVGElement>>) => JSX.Element;
  }
>;

export const Loader = ({
  w = '$148',
  h = '$148',
  icon,
  ...props
}: Props): JSX.Element => {
  const { colorScheme } = useTheme();
  const defaultIcon =
    colorScheme === ThemeColorScheme.Dark ? LoaderDarkIcon : LoaderLightIcon;

  const LoaderIcon = icon ?? defaultIcon;
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
