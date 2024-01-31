import React from 'react';

import * as Form from '@radix-ui/react-form';
import cn from 'classnames';

import { Flex } from '../flex';
import * as Text from '../typography';

import { Button } from './auto-suggest-box-button.component';
import * as cx from './auto-suggest-box-input.css';
import { useAutoSuggestBoxContext } from './auto-suggest-box.provider';

export interface Props {
  required?: boolean;
  disabled?: boolean;
  id?: string;
  label: string;
  name?: string;
  defaultValue?: string;
}

export const Input = ({
  required = false,
  disabled = false,
  label,
  name,
  defaultValue,
  id,
}: Readonly<Props>): JSX.Element => {
  const { isSuggesting, setIsSuggesting, value, setValue } =
    useAutoSuggestBoxContext();
  return (
    <Form.Root style={{ width: '100%' }}>
      <Flex justifyContent="space-between" alignItems="center">
        <Form.Field
          name="field"
          className={cn(cx.container, {
            [cx.isSuggesting]: isSuggesting,
          })}
        >
          <Form.Control asChild>
            <input
              id={id}
              type="text"
              required={required}
              placeholder=""
              className={cx.input}
              disabled={disabled}
              name={name}
              defaultValue={defaultValue}
              value={value}
              onChange={(event): void => {
                setValue(event.target.value);
                setIsSuggesting(true);
              }}
            />
          </Form.Control>
          <Form.Label className={cn(cx.label)}>{label}</Form.Label>
          <Button disabled={disabled} />
        </Form.Field>
      </Flex>
    </Form.Root>
  );
};
