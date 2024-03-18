import React from 'react';

import * as Popover from '@radix-ui/react-popover';
import * as Select from '@radix-ui/react-select';
import cn from 'classnames';

import { Box } from '../box';
import { Flex } from '../flex';
import { ScrollArea } from '../scroll-area';
import { Text } from '../text';

import { CloseButton } from './auto-suggest-box-close-button.component';
import { Icon } from './auto-suggest-box-icon.component';
import { Input } from './auto-suggest-box-input.component';
import { OpenButton } from './auto-suggest-box-open-button.component';
import { PickedSuggestion } from './auto-suggest-box-picked-suggestion.component';
import { Suggestion } from './auto-suggest-box-suggestion.component';
import * as cx from './auto-suggest-box.css';
import { useAutoSuggestBox } from './auto-suggest-box.hook';

import type {
  SuggestionBaseType,
  ValidationStatus,
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
  validationStatus?: ValidationStatus;
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
  validationStatus,
}: Readonly<Props<SuggestionType>>): JSX.Element => {
  const {
    value,
    isCloseButton,
    isSuggesting,
    filteredSuggestions,
    pickedSuggestion,
    firstSuggestionRef,
    closeSuggestions,
    onOpenButtonClick,
    onCloseButtonClick,
    onInputChange,
    onSuggestionClick,
  } = useAutoSuggestBox({
    initialValue,
    onChange,
    suggestions,
  });

  return (
    <Popover.Root open={isSuggesting} modal={false}>
      <Select.Root open={isSuggesting}>
        <Box className={cx.container}>
          <Popover.Anchor asChild>
            <Box
              className={cn(
                cx.inputContainer,
                isSuggesting ? cx.isSuggesting : cx.idle,
              )}
            >
              <Box w="$fill" pt="$24">
                <Input
                  id={id}
                  value={value}
                  label={label}
                  required={required}
                  disabled={disabled}
                  name={name}
                  onChange={onInputChange}
                  onKeyDown={(event): void => {
                    if (event.code === 'ArrowDown') {
                      firstSuggestionRef.current?.focus();
                      event.preventDefault();
                    }
                  }}
                  pickedSuggestion={
                    pickedSuggestion && (
                      <PickedSuggestion {...pickedSuggestion} />
                    )
                  }
                />
              </Box>
              <Flex alignItems="center">
                <Icon status={validationStatus} />
                {isCloseButton ? (
                  <CloseButton
                    disabled={disabled}
                    onClick={onCloseButtonClick}
                  />
                ) : (
                  <OpenButton disabled={disabled} onClick={onOpenButtonClick} />
                )}
              </Flex>
            </Box>
          </Popover.Anchor>
          <Popover.Content
            align="start"
            className={cx.popoverContent}
            onOpenAutoFocus={(event): void => {
              event.preventDefault();
            }}
          >
            <Select.Content
              asChild
              className={cx.selectContent}
              onPointerDownOutside={closeSuggestions}
            >
              <Select.Viewport>
                <ScrollArea
                  classNames={{
                    root: cx.scrollArea,
                    viewport: cx.scrollAreaViewport,
                    bar: cx.scrollBar,
                  }}
                >
                  <Box data-testid="auto-suggest-box-suggestions">
                    {filteredSuggestions.map((suggestion, index) => (
                      <Suggestion
                        {...(index === 0 ? { ref: firstSuggestionRef } : {})}
                        key={suggestion.value}
                        onClick={onSuggestionClick}
                        suggestion={suggestion}
                      />
                    ))}
                  </Box>
                </ScrollArea>
              </Select.Viewport>
            </Select.Content>
          </Popover.Content>
          {Boolean(errorMessage) && (
            <Text.Label color="error" className={cx.errorMessage}>
              {errorMessage}
            </Text.Label>
          )}
        </Box>
      </Select.Root>
    </Popover.Root>
  );
};
