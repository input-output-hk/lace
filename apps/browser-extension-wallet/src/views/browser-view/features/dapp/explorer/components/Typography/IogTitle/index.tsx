import * as React from 'react';
import classNames from 'classnames';
import { ITypographyProps } from '../types';
import { mixins } from '../../../global/styles/Themes';
import { getFontColor } from '../helpers';

import './styles.scss';

export const IogTitle: React.FC<ITypographyProps> = ({
  as = 'h1',
  center,
  bold,
  normal,
  smallest,
  small,
  medium,
  big,
  xMedium,
  spacer,
  margin,
  color = 'primary',
  className,
  style,
  children,
  ...props
}) =>
  React.createElement(
    as,
    {
      className: classNames(
        [
          {
            'iog-title': true,
            'iog-title--center': center,
            'iog-title--bold': bold,
            'iog-title--normal': normal,
            'iog-title--smallest': smallest,
            'iog-title--small': small,
            'iog-title--x-medium': xMedium,
            'iog-title--medium': medium,
            'iog-title--big': big,
            ...getFontColor(color)
          }
        ],
        className
      ),
      style: {
        ...mixins.setSpacer(spacer, true),
        ...mixins.setMargin(margin, true),
        ...style
      },
      ...props
    },
    children
  );
