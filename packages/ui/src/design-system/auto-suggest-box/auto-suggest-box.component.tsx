import type { PropsWithChildren } from 'react';
import React from 'react';

import * as Popover from '@radix-ui/react-popover';
import * as Select from '@radix-ui/react-select';
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
import * as cxSuggestion from './auto-suggest-box-suggestion.css';
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
  validationStatus,
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
    closeSuggestions,
    onButtonClick,
    onInputChange,
    onSuggestionClick,
    onPickedSuggestionClick,
  } = useAutoSuggestBox({
    initialValue,
    onChange,
    suggestions,
  });

  return (
    <Popover.Root open={isSuggesting}>
      <Popover.Anchor asChild>
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
                  <div
                    onClick={onPickedSuggestionClick}
                    className={cxSuggestion.pickedSuggesion}
                    data-testid="auto-suggest-box-picked-suggestion"
                  >
                    <PickedSuggestionComponent {...pickedSuggestion} />
                  </div>
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
            <Icon status={validationStatus} />
            <Button
              disabled={disabled}
              isCloseButton={isCloseButton}
              onButtonClick={onButtonClick}
            />
          </Flex>
        </Flex>
      </Popover.Anchor>
      {Boolean(errorMessage) && (
        <Text.Label className={cx.errorMessage}>{errorMessage}</Text.Label>
      )}
      <Select.Root open={isSuggesting}>
        <Select.Content
          asChild
          className={cx.selectContent}
          onPointerDownOutside={closeSuggestions}
        >
          <Select.Viewport asChild>
            <Popover.Content
              avoidCollisions={false}
              onOpenAutoFocus={(event): void => {
                if (value) {
                  event.preventDefault();
                }
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
                    <Select.Item
                      data-testid={`auto-suggest-box-suggestion-${props.value}`}
                      tabIndex={0}
                      key={props.value}
                      value={props.value}
                      className={cx.suggestion}
                      onClick={(): void => {
                        onSuggestionClick(props.value);
                      }}
                      onKeyDown={(event): void => {
                        if (event.code === 'Enter') {
                          onSuggestionClick(props.value);
                        }
                      }}
                    >
                      <SuggestionComponent {...props} />
                    </Select.Item>
                  ))}
                </Box>
              </ScrollArea>
            </Popover.Content>
          </Select.Viewport>
        </Select.Content>
      </Select.Root>
    </Popover.Root>
  );
};
