import type { ReactNode } from 'react';
import React, { forwardRef } from 'react';

import classNames from 'classnames';

import { sx } from '../../design-tokens';
import { Flex } from '../flex';
import { Text } from '../text';

import type { Sx } from '../../design-tokens';
import type { OmitClassName } from '../../types';

export type ButtonProps = OmitClassName<'button'> & {
  disabled?: boolean;
  className: {
    container: string;
    label: string;
    icon?: string;
  };
  label?: string;
  icon?: ReactNode;
  w?: Pick<Sx, 'w'>['w'];
  size?: 'extraSmall' | 'medium' | 'small';
  as?: React.ElementType;
};

export const SkeletonButton = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      id,
      disabled,
      className,
      label,
      icon,
      w,
      size = 'medium',
      as = 'button',
      ...props
    },
    forwardReference,
  ) => {
    const heights = {
      medium: '$48',
      small: '$40',
      extraSmall: '$24',
    };

    const radius = {
      medium: '$medium',
      small: '$small',
      extraSmall: '$extraSmall',
    };

    const Component = as;

    return (
      <Component
        {...props}
        id={id}
        disabled={disabled}
        className={classNames(
          sx({
            w,
            // TODO: rework into styleVariants, don't forget primaryButton's :before borderRadius
            // https://vanilla-extract.style/documentation/api/style-variants/#stylevariants
            height: heights[size] as Sx['height'],
            borderRadius: radius[size] as Sx['borderRadius'],
          }),
          className.container,
        )}
        ref={forwardReference}
      >
        <Flex alignItems="center" justifyContent="center">
          {icon !== undefined && (
            <Flex
              pr={label === undefined ? '$0' : '$8'}
              className={className.icon}
            >
              {icon}
            </Flex>
          )}
          {label !== undefined && (
            <Text.Button className={className.label}>{label}</Text.Button>
          )}
        </Flex>
      </Component>
    );
  },
);
// eslint-disable-next-line functional/immutable-data
SkeletonButton.displayName = 'SkeletonButton';
