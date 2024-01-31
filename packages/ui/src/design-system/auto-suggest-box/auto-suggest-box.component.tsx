/* eslint-disable react/no-multi-comp */
import React from 'react';

import * as Popover from '@radix-ui/react-popover';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import cn from 'classnames';

import { Box } from '../box';
import { Flex } from '../flex';
import * as Text from '../typography';

import { Input } from './auto-suggest-box-input.component';
import * as cx from './auto-suggest-box.css';
import {
  AutoSuggestBoxProvider,
  useAutoSuggestBoxContext,
} from './auto-suggest-box.provider';

export interface AutoSuggestBoxProps {
  required?: boolean;
  disabled?: boolean;
  id?: string;
  label: string;
  name?: string;
  items?: { value: string; label?: string }[];
  errorMessage?: string;
  onChange?: (value: string) => void;
  initialValue?: string;
}

export const AutoSuggestBoxBase = ({
  id,
  required = false,
  disabled = false,
  label,
  name,
  errorMessage,
}: Readonly<AutoSuggestBoxProps>): JSX.Element => {
  const { suggestions, setValue, isSuggesting, setIsSuggesting } =
    useAutoSuggestBoxContext();

  return (
    <Popover.Root open={isSuggesting}>
      <Popover.Anchor>
        <Flex justifyContent="space-between" flexDirection="column">
          <Input
            id={id}
            label={label}
            required={required}
            disabled={disabled}
            name={name}
          />
          {Boolean(errorMessage) && (
            <Text.Label className={cx.errorMessage}>{errorMessage}</Text.Label>
          )}
        </Flex>
      </Popover.Anchor>
      <Popover.Content
        asChild
        avoidCollisions={false}
        onOpenAutoFocus={(event): void => {
          event.preventDefault();
        }}
      >
        <ScrollArea.Root className={cx.scrollArea}>
          <ScrollArea.Viewport className={cx.scrollAreaViewport}>
            <ScrollArea.Scrollbar orientation="vertical">
              <ScrollArea.Thumb />
            </ScrollArea.Scrollbar>
            {suggestions.map(item => (
              <div
                key={item.value}
                onClick={(): void => {
                  setIsSuggesting(false);
                  setValue(item.value);
                }}
              >
                <Box className={cn(cx.item)}>
                  <Text.Body.Large weight="$semibold">
                    {item.label ?? item.value}
                  </Text.Body.Large>
                </Box>
              </div>
            ))}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Popover.Content>
    </Popover.Root>
  );
};

export const AutoSuggestBox = ({
  items = [],
  ...props
}: Readonly<AutoSuggestBoxProps>): JSX.Element => (
  <AutoSuggestBoxProvider
    onChange={props.onChange}
    initialValue={props.initialValue}
    items={items}
  >
    <AutoSuggestBoxBase {...props} />
  </AutoSuggestBoxProvider>
);
