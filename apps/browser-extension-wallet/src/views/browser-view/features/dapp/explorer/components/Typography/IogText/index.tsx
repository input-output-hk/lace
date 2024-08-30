import * as React from 'react';
import classNames from 'classnames';
import { ITypographyProps } from '../types';
import { mixins } from '../../../global/styles/Themes';
import { getFontColor } from '../helpers';

import './styles.scss';

export const IogText = ({
  as = 'p',
  center,
  bold,
  normal,
  smallest,
  small,
  smaller,
  xMedium,
  xxMedium,
  medium,
  spacer,
  margin,
  color = 'dark',
  altColor,
  uppercase,
  className,
  style,
  children,
  justify,
  ...props
}: ITypographyProps) =>
  React.createElement(
    as,
    {
      className: classNames(
        [
          {
            'iog-text': true,
            'iog-text--center': center,
            'iog-text--bold': bold,
            'iog-text--normal': normal,
            'iog-text--smallest': smallest,
            'iog-text--smaller': smaller,
            'iog-text--small': small,
            'iog-text--x-medium': xMedium,
            'iog-text--xx-medium': xxMedium,
            'iog-text--medium': medium,
            'iog-text--uppercase': uppercase,
            'iog-text--justify': justify,
            ...getFontColor(color)
          }
        ],
        className
      ),
      style: {
        ...mixins.setSpacer(spacer, true),
        ...mixins.setMargin(margin, true),
        ...mixins.setColor(altColor),
        ...style
      },
      ...props
    },
    children
  );
