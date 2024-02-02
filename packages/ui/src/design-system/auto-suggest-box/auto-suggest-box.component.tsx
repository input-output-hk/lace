/* eslint-disable react/no-multi-comp */
import React from 'react';

import * as Popover from '@radix-ui/react-popover';
import cn from 'classnames';

import { Box } from '../box';
import { Flex } from '../flex';
import { ScrollArea } from '../scroll-area';
import * as Text from '../typography';

import { Button } from './auto-suggest-box-button.component';
import { Input } from './auto-suggest-box-input.component';
import { Loader } from './auto-suggest-box-loader.component';
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
  suggestions?: { value: string; label?: string }[];
  errorMessage?: string;
  onChange?: (value: string) => void;
  initialValue?: string;
  isValidating?: boolean;
}

export const AutoSuggestBoxBase = ({
  id,
  required = false,
  disabled = false,
  label,
  name,
  errorMessage,
  isValidating,
}: Readonly<AutoSuggestBoxProps>): JSX.Element => {
  const { suggestions, setValue, isSuggesting, setIsSuggesting } =
    useAutoSuggestBoxContext();

  return (
    <Popover.Root open={isSuggesting}>
      <Popover.Anchor>
        <Flex flexDirection="column">
          <Flex
            justifyContent="space-between"
            className={cn(cx.container, {
              [cx.isSuggesting]: isSuggesting,
            })}
          >
            <Box>
              <Input
                id={id}
                label={label}
                required={required}
                disabled={disabled}
                name={name}
              />
            </Box>
            <Flex alignItems="center">
              <Loader isValidating={isValidating} />
              <Button disabled={disabled} />
            </Flex>
          </Flex>

          {Boolean(errorMessage) && (
            <Text.Label className={cx.errorMessage}>{errorMessage}</Text.Label>
          )}
        </Flex>
      </Popover.Anchor>
      <Popover.Content
        avoidCollisions={false}
        onOpenAutoFocus={(event): void => {
          event.preventDefault();
        }}
      >
        <ScrollArea
          classNames={{
            root: cx.scrollArea,
            viewport: cx.scrollAreaViewport,
            bar: cx.scrollBar,
          }}
        >
          <Box data-testid="auto-suggest-box-suggestions">
            {suggestions.map(suggestion => (
              <div
                data-testid={`auto-suggest-box-suggestion-${suggestion.value}`}
                className={cn(cx.suggestion)}
                key={suggestion.value}
                onClick={(): void => {
                  setIsSuggesting(false);
                  setValue(suggestion.value);
                }}
              >
                <Text.Body.Large weight="$semibold">
                  {suggestion.label ?? suggestion.value}
                </Text.Body.Large>
              </div>
            ))}
          </Box>
        </ScrollArea>
      </Popover.Content>
    </Popover.Root>
  );
};

export const AutoSuggestBox = ({
  suggestions = [],
  ...props
}: Readonly<AutoSuggestBoxProps>): JSX.Element => (
  <AutoSuggestBoxProvider
    onChange={props.onChange}
    initialValue={props.initialValue}
    suggestions={suggestions}
  >
    <AutoSuggestBoxBase {...props} />
  </AutoSuggestBoxProvider>
);
