import React, { useCallback } from 'react';

import * as ToggleGroup from '@radix-ui/react-toggle-group';
import classNames from 'classnames';

import * as cx from './toggle-button-group-root.css';

import type { ToggleGroupSingleProps } from '@radix-ui/react-toggle-group';

type ToggleGroupSingleOptionalProps = Pick<
  ToggleGroupSingleProps,
  'loop' | 'rovingFocus'
>;

type ToggleGroupSingleRequiredProps = Required<
  Pick<ToggleGroupSingleProps, 'children' | 'onValueChange' | 'value'>
>;

export type ToggleButtonGroupRootProps = ToggleGroupSingleOptionalProps &
  ToggleGroupSingleRequiredProps & {
    variant?: 'compact' | 'wide';
    disabled?: boolean;
  };

export const Root = ({
  children,
  onValueChange,
  variant = 'wide',
  disabled,
  ...props
}: Readonly<ToggleButtonGroupRootProps>): JSX.Element => {
  const handleValueChange = useCallback(
    (newValue: string): void => {
      if (newValue) onValueChange(newValue);
    },
    [onValueChange],
  );

  return (
    <ToggleGroup.Root
      className={classNames(cx.root, {
        [cx.rootCompact]: variant === 'compact',
        [cx.rootDisabled]: disabled,
      })}
      type="single"
      onValueChange={handleValueChange}
      disabled={disabled}
      {...props}
    >
      {children}
    </ToggleGroup.Root>
  );
};
