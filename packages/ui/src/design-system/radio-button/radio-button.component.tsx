import React, { useEffect, useState } from 'react';

import * as RadixRadioGroup from '@radix-ui/react-radio-group';
import cn from 'classnames';

import { Box } from '../box';
import { Flex } from '../flex';

import * as cx from './radio-button.css';

type OptionRenderFunction = (
  parameters: Readonly<{
    onOptionClick: () => void;
    optionElement: Readonly<React.ReactElement>;
    outlineClassName: string;
  }>,
) => React.ReactElement;

export interface RadioButtonGroupOption<Value extends string> {
  value: Value;
  label: React.ReactNode;
  icon?: JSX.Element;
  onIconClick?: () => void;
  tooltipText?: string;
  defaultOutlineDisabled?: boolean;
  render?: OptionRenderFunction;
}

export interface RadioButtonGroupProps<Value extends string> {
  disabled?: boolean;
  className?: string;
  selectedValue?: Value;
  options: RadioButtonGroupOption<Value>[];
  onValueChange: (value: Value) => void;
}

const defaultRenderFunction: OptionRenderFunction = ({ optionElement }) =>
  optionElement;

export const RadioButtonGroup = <Value extends string>({
  disabled = false,
  onValueChange,
  className,
  selectedValue,
  options,
  ...props
}: Readonly<RadioButtonGroupProps<Value>>): JSX.Element => {
  const [localSelection, setLocalSelection] = useState<Value>();
  const [previouslyPassedSelectedValue, setPreviouslyPassedSelectedValue] =
    useState<Value>();

  useEffect(() => {
    if (selectedValue === previouslyPassedSelectedValue) return;
    setLocalSelection(selectedValue);
    setPreviouslyPassedSelectedValue(selectedValue);
  }, [previouslyPassedSelectedValue, selectedValue]);

  const onChange = (value: Value): void => {
    setLocalSelection(value);
    onValueChange(value);
  };

  return (
    <Box className={cn(className, cx.root)}>
      <RadixRadioGroup.Root
        {...props}
        value={localSelection}
        disabled={disabled}
        onValueChange={onChange}
        className={cx.radioGroupRoot}
      >
        {options.map(
          ({
            value,
            label,
            icon,
            onIconClick,
            defaultOutlineDisabled = false,
            render = defaultRenderFunction,
          }) => {
            const hasLabel = Boolean(label);

            return (
              <Flex
                alignItems="center"
                className={cx.radioGroupItemWrapper}
                key={value}
              >
                {render({
                  onOptionClick: () => {
                    onChange(value);
                  },
                  outlineClassName: cx.outline,
                  optionElement: (
                    <Flex
                      alignItems="center"
                      className={cn(
                        cx.radioGroupItem[hasLabel ? 'withLabel' : 'default'],
                        {
                          [cx.radioGroupItemOutline[
                            hasLabel ? 'withLabel' : 'default'
                          ]]: !defaultOutlineDisabled,
                        },
                      )}
                    >
                      <RadixRadioGroup.Item
                        id={`radio-btn-control-id-${value}`}
                        value={value}
                        className={cx.radioGroupIndicatorWrapper}
                        data-testid={`radio-btn-test-id-${value}`}
                      >
                        <RadixRadioGroup.Indicator
                          className={cx.radioGroupIndicator}
                        />
                      </RadixRadioGroup.Item>
                      {hasLabel && (
                        <label
                          id={`radio-btn-label-id-${value}`}
                          htmlFor={`radio-btn-control-id-${value}`}
                        >
                          <Box
                            className={cn(cx.label, {
                              [cx.disabled]: disabled,
                            })}
                          >
                            {label}
                          </Box>
                        </label>
                      )}
                      {icon !== undefined && value === selectedValue && (
                        <Flex
                          justifyContent="flex-end"
                          className={cx.iconWrapper}
                        >
                          <button
                            className={cx.iconButton}
                            disabled={disabled}
                            onClick={onIconClick}
                            tabIndex={-1}
                            id={`radio-btn-sorting-id-${value}`}
                          >
                            {icon}
                          </button>
                        </Flex>
                      )}
                    </Flex>
                  ),
                })}
              </Flex>
            );
          },
        )}
      </RadixRadioGroup.Root>
    </Box>
  );
};
