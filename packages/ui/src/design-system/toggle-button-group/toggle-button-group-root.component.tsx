import React, { useCallback, createContext } from 'react';

import * as ToggleGroup from '@radix-ui/react-toggle-group';
import classNames from 'classnames';

import * as cx from './toggle-button-group-root.css';

import type { ToggleGroupSingleProps } from '@radix-ui/react-toggle-group';

type Variant = 'compact' | 'wide' | 'small';

const ToggleButtonGroupContext = createContext<Variant>('wide');

type ToggleGroupSingleOptionalProps = Pick<
  ToggleGroupSingleProps,
  'loop' | 'rovingFocus'
>;

type ToggleGroupSingleRequiredProps = Required<
  Pick<ToggleGroupSingleProps, 'children' | 'onValueChange' | 'value'>
>;

export type ToggleButtonGroupRootProps = ToggleGroupSingleOptionalProps &
  ToggleGroupSingleRequiredProps & {
    variant?: Variant;
    disabled?: boolean;
  };

export const useToggleButtonGroupContext = (): Variant => {
  const context = React.useContext(ToggleButtonGroupContext);

  return context;
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
    <ToggleButtonGroupContext.Provider value={variant}>
      <ToggleGroup.Root
        className={classNames(cx.root, {
          [cx.rootCompact]: variant === 'compact',
          [cx.rootSmall]: variant === 'small',
          [cx.rootDisabled]: disabled,
          [cx.defaultRadius]: variant !== 'small',
        })}
        type="single"
        onValueChange={handleValueChange}
        disabled={disabled}
        {...props}
      >
        {children}
      </ToggleGroup.Root>
    </ToggleButtonGroupContext.Provider>
  );
};
