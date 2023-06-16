import type { ReactNode } from 'react';
import React from 'react';

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
  };
  label?: string;
  icon?: ReactNode;
  w?: Pick<Sx, 'w'>['w'];
};

export const SkeletonButton = ({
  id,
  disabled,
  className,
  label,
  icon,
  w,
  ...props
}: Readonly<ButtonProps>): JSX.Element => {
  return (
    <button
      {...props}
      id={id}
      disabled={disabled}
      className={classNames(sx({ w }), className.container)}
    >
      <Flex alignItems="center" justifyContent="center">
        {icon !== undefined && (
          <Flex pr={label === undefined ? '$0' : '$8'}>{icon}</Flex>
        )}
        {label !== undefined && (
          <Text.Button className={className.label}>{label}</Text.Button>
        )}
      </Flex>
    </button>
  );
};
