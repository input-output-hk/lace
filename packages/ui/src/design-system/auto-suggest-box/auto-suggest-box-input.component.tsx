import React from 'react';

import * as Form from '@radix-ui/react-form';
import cn from 'classnames';

import { Flex } from '../flex';

import * as cx from './auto-suggest-box-input.css';
import { useAutoSuggestBoxContext } from './auto-suggest-box.provider';

export interface Props {
  required?: boolean;
  disabled?: boolean;
  id?: string;
  label: string;
  name?: string;
}

export const Input = ({
  required = false,
  disabled = false,
  label,
  name,
  id,
}: Readonly<Props>): JSX.Element => {
  const { setIsSuggesting, value, setValue } = useAutoSuggestBoxContext();
  return (
    <Form.Root>
      <Flex justifyContent="space-between" alignItems="center">
        <Form.Field name="field">
          <Form.Control asChild>
            <input
              data-testid="auto-suggest-box-input"
              id={id}
              type="text"
              required={required}
              className={cx.input}
              disabled={disabled}
              name={name}
              value={value}
              onChange={(event): void => {
                setValue(event.target.value);
                setIsSuggesting(true);
              }}
            />
          </Form.Control>
          <Form.Label className={cn(cx.label)}>{label}</Form.Label>
        </Form.Field>
      </Flex>
    </Form.Root>
  );
};
