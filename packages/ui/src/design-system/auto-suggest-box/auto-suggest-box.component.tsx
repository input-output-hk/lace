import type { PropsWithChildren } from 'react';
import React from 'react';

import * as Popover from '@radix-ui/react-popover';
import cn from 'classnames';

import { Box } from '../box';
import { Flex } from '../flex';
import { ScrollArea } from '../scroll-area';
import * as Text from '../typography';

import { Button } from './auto-suggest-box-button.component';
import { Icon } from './auto-suggest-box-icon.component';
import { Input } from './auto-suggest-box-input.component';
import {
  PickedSuggestionClassic,
  SuggestionClassic,
} from './auto-suggest-box-suggestion.component';
import * as cx from './auto-suggest-box.css';
import { useAutoSuggestBox } from './auto-suggest-box.hook';

import type {
  SuggestionBaseType,
  ValidationState,
} from './auto-suggest-box-types';

export interface Props<
  SuggestionType extends SuggestionBaseType = SuggestionBaseType,
> {
  required?: boolean;
  disabled?: boolean;
  id?: string;
  label: string;
  name?: string;
  suggestions?: SuggestionType[];
  errorMessage?: string;
  onChange?: (value: string) => void;
  initialValue?: string;
  validationState?: ValidationState;
  suggestionComponent?: React.FC<SuggestionType>;
  pickedSuggestionComponent?: React.FC<SuggestionType>;
}

export const AutoSuggestBox = <SuggestionType extends SuggestionBaseType>({
  id,
  required = false,
  disabled = false,
  label,
  name,
  initialValue,
  onChange,
  suggestions = [],
  errorMessage,
  validationState,
  suggestionComponent: SuggestionComponent = SuggestionClassic,
  pickedSuggestionComponent:
    PickedSuggestionComponent = PickedSuggestionClassic,
}: Readonly<PropsWithChildren<Props<SuggestionType>>>): JSX.Element => {
  const {
    value,
    isCloseButton,
    isSuggesting,
    filteredSuggestions,
    pickedSuggestion,
    onButtonClick,
    onInputChange,
    onSuggestionClick,
  } = useAutoSuggestBox({
    initialValue,
    onChange,
    suggestions,
  });

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
            <Box w="$fill">
              <Input
                id={id}
                value={value}
                pickedSuggestion={
                  pickedSuggestion ? (
                    <PickedSuggestionComponent {...pickedSuggestion} />
                  ) : undefined
                }
                label={label}
                required={required}
                disabled={disabled}
                name={name}
                onChange={onInputChange}
              />
            </Box>
            <Flex alignItems="center">
              <Icon state={validationState} />
              <Button
                disabled={disabled}
                isCloseButton={isCloseButton}
                onButtonClick={onButtonClick}
              />
            </Flex>
          </Flex>

          {Boolean(errorMessage) && (
            <Text.Label className={cx.errorMessage}>{errorMessage}</Text.Label>
          )}
        </Flex>
      </Popover.Anchor>
      <Popover.Content
        className={cx.popover}
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
            {filteredSuggestions.map(props => (
              <div
                key={props.value}
                data-testid={`auto-suggest-box-suggestion-${props.value}`}
                className={cx.suggestion}
                onClick={(): void => {
                  onSuggestionClick(props.value);
                }}
              >
                <SuggestionComponent {...props} />
              </div>
            ))}
          </Box>
        </ScrollArea>
      </Popover.Content>
    </Popover.Root>
  );
};
