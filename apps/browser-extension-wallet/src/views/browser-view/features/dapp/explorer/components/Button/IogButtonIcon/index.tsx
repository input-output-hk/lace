import { omit } from 'lodash';
import * as React from 'react';
import { Icon } from '../../Icon';
import { IIogButtonIconProps } from '../types';
import classNames from 'classnames';
import { mixins } from '../../../global/styles/Themes';

import './styles.scss';
export const IogButtonIcon: React.FC<IIogButtonIconProps> = ({
  name,
  iconProps,
  circle,
  primary,
  secondary,
  standard,
  alternative,
  solid,
  spacer,
  margin,
  padding,
  className,
  ref,
  ...props
}) => (
  <button
    className={classNames([
      {
        'iog-button-icon': true,
        'iog-button-icon--circle': circle,
        'iog-button-icon--primary': primary,
        'iog-button-icon--secondary': secondary,
        'iog-button-icon--standard': standard,
        'iog-button-icon--solid': solid,
        'iog-button-icon--alternative': alternative
      },
      className
    ])}
    style={{
      ...mixins.setSpacer(spacer, true),
      ...mixins.setMargin(margin, true),
      ...mixins.setPadding(padding, true)
    }}
    {...omit(props, 'transparent')}
    ref={ref}
  >
    {name && <Icon name={name} {...iconProps} />}
  </button>
);
