import IogLink from '../../Link';
// Dependencies
import * as React from 'react';
import classNames from 'classnames';
import { useController, useFormState } from 'react-hook-form';
// Component type
import type { IInputProps } from './types';

// Components
import { IogBox } from '../../Grid';
import { IogText } from '../../Typography';
import { EIconsName } from '../../Icon';
import { IogButton, IogButtonIcon } from '../../Button';
import Cancel from '../../../assets/icons/cancel-icon.component.svg';
import Icon from '@ant-design/icons';

// Helpers
import { requireMessageTextColor } from './helpers';
import { getFormArrayError } from '../../../services/helpers';

// Style
import './styles.scss';

const { useRef, useState } = React;

export const IogInput = React.memo(
  // eslint-disable-next-line complexity
  ({
    register,
    name,
    className = '',
    spacer,
    requireMessage,
    size,
    defaultValue,
    required = false,
    inputLink,
    registerOptions,
    light,
    control,
    label,
    e2ePrefix,
    placeholder = ' ',
    checkProfanity,
    children,
    setError,
    onClearField,
    ...rest
  }: IInputProps) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [showPassword, setShowPassword] = useState<boolean>(false);

    const isSearchOptions = rest.type === 'search' ? { required: true, minLength: 1 } : {};

    const { ref, ...restRegister } = register
      ? register(name, {
          ...registerOptions,
          ...isSearchOptions,
          required
        })
      : { ref: () => {} };
    const { field } = useController({ control, name });
    const { errors } = useFormState({ control, name });

    const errorMessage = Array.isArray(errors?.[name.split('.')[0]])
      ? getFormArrayError(errors, name)
      : (errors?.[name]?.message as string);

    const handleTogglePasswordVisibility = (e: any): void => {
      e.preventDefault();

      if (!inputRef.current) return;
      const isInputPassword = inputRef.current?.type === 'password';
      inputRef.current.type = isInputPassword ? 'text' : 'password';
      setShowPassword(isInputPassword);
    };

    const handleFocus = (): void => {
      inputRef.current?.focus();
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createReference = (e: any) => {
      ref(e);
      inputRef.current = e;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleClearInput = (e: any): void => {
      e.preventDefault();
      onClearField?.();
    };

    return (
      <IogBox
        className={classNames([
          {
            'iog-input-container': true,
            'iog-input-container--light': light,
            'iog-input-container--password': rest.type === 'password',
            'iog-input-container--search': rest.type === 'search',
            'iog-input-container--search--active': rest.type === 'search' && field?.value
          },
          className
        ])}
        size={size && String(size)}
        spacer={spacer}
      >
        {rest.type === 'search' && (
          <IogButtonIcon
            role="search_button_focus"
            className="iog-input__search-indicator-button"
            transparent
            onClick={handleFocus}
            name={EIconsName.SEARCH_LACE_THEME}
          />
        )}

        <input
          className="iog-input"
          {...rest}
          placeholder={placeholder}
          {...restRegister}
          ref={createReference}
          defaultValue={defaultValue}
          data-testid={`${e2ePrefix}-input-${name}`}
        />

        {label && (
          <IogText
            as="label"
            className="iog-input__label"
            xMedium
            color={errorMessage ? 'error' : requireMessageTextColor({ light })}
          >
            {label}
          </IogText>
        )}

        {rest.type === 'search' && field?.value && (
          <IogButton
            role="search_button_clear"
            className="iog-input__search-indicator-button--clear"
            standard
            onClick={handleClearInput}
            data-testid="categories-btn-clear"
          >
            <Icon component={Cancel} />
          </IogButton>
        )}

        {rest.type === 'password' && (
          <IogButtonIcon
            type="button"
            role="password_button"
            className="iog-input__password-visibility-button"
            transparent
            onClick={handleTogglePasswordVisibility}
            name={showPassword ? EIconsName.PASSWORD_ON : EIconsName.PASSWORD_OFF}
          />
        )}

        {(requireMessage || inputLink) && (
          <IogText
            className={{ 'iog-input--has-input-link': Boolean(inputLink) }}
            smaller
            spacer={8}
            color={errorMessage ? 'error' : requireMessageTextColor({ light })}
            data-testid={errorMessage ? `${e2ePrefix}-errorMessage-${name}` : `${e2ePrefix}-label-${name}`}
          >
            {errorMessage || requireMessage}
            {inputLink && (
              <IogLink data-testid={`${e2ePrefix}-link-${inputLink.e2eId}`} to={inputLink.url}>
                {inputLink?.label}
              </IogLink>
            )}
          </IogText>
        )}

        {children}
      </IogBox>
    );
  }
);

IogInput.displayName = 'IogInput';
