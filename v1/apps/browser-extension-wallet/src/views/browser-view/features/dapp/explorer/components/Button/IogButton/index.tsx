/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from 'react';
import { Icon } from '../../Icon';
import { IIogButtonProps } from '../types';
import classNames from 'classnames';
import { mixins } from '../../../global/styles/Themes';
import { IogText } from '../../Typography';

import './styles.scss';
import omit from 'lodash/omit';

const getThemeClasses = ({
  primary = true,
  secondary,
  outline,
  dark,
  addmore,
  transparent,
  standard,
  solid,
  tag
}: IIogButtonProps): Partial<Record<string, boolean>> => ({
  ...(primary && { 'iog-button--primary': primary }),
  ...(secondary && { 'iog-button--secondary': secondary }),
  ...(outline && { 'iog-button--outline': outline }),
  ...(dark && { 'iog-button--dark': dark }),
  ...(transparent && { 'iog-button--transparent': transparent }),
  ...(addmore && { 'iog-button--add-more': addmore }),
  ...(standard && { 'iog-button--standard': standard }),
  ...(solid && { 'iog-button--solid': solid }),
  ...(tag && { 'iog-button--tag': tag })
});

const getSizeClasses = ({ small }: IIogButtonProps): Partial<Record<string, boolean>> => ({
  ...(small && { 'iog-button--small': small })
});

export const IogButton = React.forwardRef(
  (
    {
      iconProps,
      circle,
      spacer,
      margin,
      padding,
      icon,
      children,
      reverse,
      className,
      hasBorder,
      label,
      ...props
    }: IIogButtonProps,
    _ref
  ) => (
    <button
      className={classNames([
        {
          'iog-button': true,
          'iog-button--circle': circle,
          'iog-button--reverse': reverse,
          'iog-button--border': hasBorder,
          ...getThemeClasses(props),
          ...getSizeClasses(props)
        },
        className
      ])}
      style={{
        ...mixins.setSpacer(spacer, true),
        ...mixins.setMargin(margin, true),
        ...mixins.setPadding(padding, true)
      }}
      {...omit(props, 'primary', 'transparent', 'standard')}
    >
      {icon && <Icon name={icon} {...iconProps} />}
      <IogText as="span" smaller color="light" bold>
        {children} {label}
      </IogText>
    </button>
  )
);
IogButton.displayName = 'IogButton';
