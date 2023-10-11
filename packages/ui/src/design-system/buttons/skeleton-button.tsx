import type { ReactNode } from 'react';
import React, { forwardRef } from 'react';

import classNames from 'classnames';

import { sx } from '../../design-tokens';
import { Flex } from '../flex';
import * as Text from '../typography';

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
  size?: 'medium' | 'small';
};

export const SkeletonButton = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { id, disabled, className, label, icon, w, size = 'medium', ...props },
    forwardReference,
  ) => {
    return (
      <button
        {...props}
        id={id}
        disabled={disabled}
        className={classNames(
          sx({
            w,
            // TODO: rework into styleVariants, don't forget primaryButton's :before borderRadius
            // https://vanilla-extract.style/documentation/api/style-variants/#stylevariants
            height: size === 'small' ? '$40' : '$48',
            borderRadius: size === 'small' ? '$small' : '$medium',
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
      </button>
    );
  },
);
// eslint-disable-next-line functional/immutable-data
SkeletonButton.displayName = 'SkeletonButton';
