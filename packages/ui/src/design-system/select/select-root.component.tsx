import type { ReactNode } from 'react';
import React from 'react';

import { ReactComponent as ChevronDownIcon } from '@lace/icons/dist/ChevronDownComponent';
import * as Select from '@radix-ui/react-select';

import { Item, ItemRoot } from './select-item';
import * as cx from './select-root.component.css';

import type { SelectItemPrivateProps } from './select-item';
import type { SelectAlign, SelectVariant } from './types';
import type { SelectProps } from '@radix-ui/react-select';

export type SelectRootProps = Pick<
  SelectProps,
  'children' | 'disabled' | 'name' | 'required'
> & {
  id?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  align?: SelectAlign;
  defaultOpen?: boolean;
  showArrow?: boolean;
  value: string | undefined;
  variant?: SelectVariant;
  portalContainer?: HTMLElement;
};

const isValidSelectRootChild = (
  node: ReactNode,
): node is React.ReactElement<SelectItemPrivateProps> =>
  React.isValidElement(node) && (node.type === Item || node.type === ItemRoot);

/**
 * @param align The preferred alignment against the anchor. May change when collisions occur. Choosing `selected`
 * is the same as `position="item-aligned"` and `bottom` translates to `position="popper"` and `align="start"`.
 * See: https://www.radix-ui.com/primitives/docs/components/select#content
 * @param children Must be either `<Select.Item />` or `<Select.ItemRoot />`. Rendered as children of `<Select.Viewport />`.
 * In most of the cases it's recommended to use the `<Select.Item />` which implements the standard layout and styling.
 * If you need more flexibility you can use primitive components like `<Select.ItemRoot />`, `<Select.ItemText />`
 * and `<Select.ItemIndicator />`. Be sure to discuss this with designer first and then decide if you should extend
 * the existing component or compose a custom version of it using the primitives.
 * @param disabled See: https://www.radix-ui.com/primitives/docs/components/select#root
 * @param id The unique element's identifier.
 * @param name See: https://www.radix-ui.com/primitives/docs/components/select#root
 * @param onChange `onValueChange` See: https://www.radix-ui.com/primitives/docs/components/select#root
 * @param defaultOpen The default value for open state of the select.
 * @param placeholder See: https://www.radix-ui.com/primitives/docs/components/select#value
 * @param portalContainer The HTMLElement which will be passed as `container` to the Radix `<Select.Portal />`.
 * See: https://www.radix-ui.com/primitives/docs/components/select#portal
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
  portalContainer,
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
      <Select.Portal container={portalContainer}>
        <Select.Content
          className={cx.content[variant]}
          position={align === 'selected' ? 'item-aligned' : 'popper'}
        >
          <Select.Viewport>
            {React.Children.map(children, child => {
              if (isValidSelectRootChild(child)) {
                return React.cloneElement(child, {
                  variant,
                });
              }
              console.error(
                `ui::Select: Children of <Select.Root /> must be either <Select.Item /> or <Select.ItemRoot />. Provided:`,
                child,
              );
              return child;
            })}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};
