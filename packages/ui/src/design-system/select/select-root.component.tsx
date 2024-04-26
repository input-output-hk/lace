import React from 'react';

import { ReactComponent as ChevronDownIcon } from '@lace/icons/dist/ChevronDownComponent';
import * as Select from '@radix-ui/react-select';

import * as cx from './select-root.component.css';

import type { SelectItemPrivateProps } from './select-item';
import type { SelectVariant } from './types';
import type { SelectProps } from '@radix-ui/react-select';

export type SelectRootProps = Pick<
  SelectProps,
  'children' | 'disabled' | 'name' | 'required'
> & {
  id?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  align?: 'bottom' | 'selected';
  defaultOpen?: boolean;
  showArrow?: boolean;
  value: string | undefined;
  variant?: SelectVariant;
};
/**
 * @param align The preferred alignment against the anchor. May change when collisions occur. Choosing `selected`
 * is the same as `position="item-aligned"` and `bottom` translates to `position="popper"` and `align="start"`.
 * See: https://www.radix-ui.com/primitives/docs/components/select#content
 * @param children <Select.Viewport /> children.
 * See: https://www.radix-ui.com/primitives/docs/components/select#viewport
 * @param disabled See: https://www.radix-ui.com/primitives/docs/components/select#root
 * @param id The unique element's identifier.
 * @param name See: https://www.radix-ui.com/primitives/docs/components/select#root
 * @param onChange `onValueChange` See: https://www.radix-ui.com/primitives/docs/components/select#root
 * @param defaultOpen The default value for open state of the select.
 * @param placeholder See: https://www.radix-ui.com/primitives/docs/components/select#value
 * @param required See: https://www.radix-ui.com/primitives/docs/components/select#root
 * @param showArrow Render arrow icon next to the input value, when the Select is closed.
 * @param value See: https://www.radix-ui.com/primitives/docs/components/select#root
 * @param variant The style variant.
 */
export const Root = ({
  align = 'selected',
  children,
  disabled,
  id,
  name,
  onChange,
  defaultOpen = false,
  placeholder,
  required,
  showArrow = false,
  value,
  variant = 'plain',
}: Readonly<SelectRootProps>): JSX.Element => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <Select.Root
      name={name}
      open={isOpen}
      value={value}
      required={required}
      disabled={disabled}
      onOpenChange={setIsOpen}
      onValueChange={onChange}
    >
      <Select.Trigger className={cx.trigger[variant]} id={id}>
        <Select.Value placeholder={placeholder} />
        {showArrow && (
          <Select.Icon asChild>
            <ChevronDownIcon className={cx.triggerIcon} />
          </Select.Icon>
        )}
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className={cx.content[variant]}
          position={align === 'selected' ? 'item-aligned' : 'popper'}
        >
          <Select.Viewport>
            {React.Children.map(children, child => {
              if (React.isValidElement(child)) {
                return React.cloneElement<SelectItemPrivateProps>(
                  child as React.ReactElement<SelectItemPrivateProps>,
                  {
                    variant,
                  },
                );
              }
              return child;
            })}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};
