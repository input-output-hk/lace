import React from 'react';

import classNames from 'classnames';

import { ReactComponent as LaceGradient } from '../../assets/icons/lace-gradient.component.svg';

import { NavigationSkeletonButton } from './icon-skeleton-button.component';
import * as cx from './secondary-button.css';

import type { API } from './icon-buttons.data';

type Props = API & {
  stroke?: boolean;
  fill?: boolean;
};

export const Secondary = ({
  icon,
  stroke = true,
  fill = false,
  ...props
}: Readonly<Props>): JSX.Element => (
  <NavigationSkeletonButton
    {...props}
    className={classNames({
      [cx.stroke]: stroke,
      [cx.fill]: fill,
    })}
  >
    {icon}
    <LaceGradient width={0} height={0} />
  </NavigationSkeletonButton>
);
