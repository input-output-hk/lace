/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable unicorn/no-nested-ternary */
import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { Tooltip, Input } from 'antd';
import { Button, getTextWidth } from '@lace/common';
import { useTranslate } from '@src/ui/hooks/useTranslate';
import { ReactComponent as Chevron } from '../../assets/icons/chrvro-right.component.svg';
import styles from './AssetInput.module.scss';
import { validateNumericValue } from '@src/ui/utils/validate-numeric-value';
import { sanitizeNumber } from '@ui/utils/sanitize-number';

const isSameNumberFormat = (num1: string, num2: string) => {
  if (!num1 || !num2) return false;
  const strippedNum = Number(num2?.replace(/,/g, ''));
  return Number(num1) === strippedNum;
};

const defaultInputWidth = 18;

export interface AssetInputProps {
  inputId: string;
  coin: { id: string; balance: string; src?: string; ticker?: string; shortTicker?: string };
  onChange: (args: { value: string; prevValue?: string; id: string; element?: any; maxDecimals?: number }) => void;
  onBlur?: (args: { value: string; id: string; maxDecimals?: number }) => void;
  onFocus?: (args: { value: string; id: string; maxDecimals?: number }) => void;
  fiatValue: string;
  formattedFiatValue?: string;
  value?: string;
  compactValue?: string;
  displayValue?: string;
  invalid?: boolean;
  error?: string;
  allowFloat?: boolean;
  maxDecimals?: number;
  onNameClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  max?: string;
  hasMaxBtn?: boolean;
  hasReachedMaxAmount?: boolean;
  focused?: boolean;
  onBlurErrors?: Set<string>;
  getErrorMessage: (message: string) => string;
  setFocusInput?: (input?: string) => void;
  setFocus?: (focus: boolean) => void;
}

const placeholderValue = '0';

// eslint-disable-next-line complexity
export const AssetInput = ({
  inputId,
  value,
  compactValue,
  displayValue,
  onChange,
  onFocus,
  onBlur,
  coin,
  allowFloat = true,
  maxDecimals,
  invalid = false,
  onNameClick,
  fiatValue,
  onBlurErrors,
  error,
  getErrorMessage,
  formattedFiatValue = fiatValue,
  max,
  hasMaxBtn = true,
  hasReachedMaxAmount,
  focused,
  setFocusInput,
  setFocus
}: AssetInputProps): React.ReactElement => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputRef = useRef<any>(null);
  const [isInvalid, setIsInvalid] = useState(invalid);
  const [isTouched, setIsTouched] = useState(false);

  const adjustInputWidth = useCallback((text: string) => {
    if (!inputRef?.current?.input) return;
    const textWidth = !text || text === '0' ? defaultInputWidth : getTextWidth(text, inputRef.current.input);
    const numberOneQuantity = text?.match(/1/g)?.length || 0;
    // cursorBufferWidth - represents a space buffer (in px) between the cursor and particular number char
    // for "1" it's approximately 2.4px from each side, for every other - about 0.5px (it might be diff per font type/weight/letter spacing)
    // eslint-disable-next-line no-magic-numbers
    const cursorBufferWidth = numberOneQuantity * 5.5 + (text?.length || 1) - numberOneQuantity + 45;
    inputRef.current.input.style.width = `${textWidth + cursorBufferWidth}px`;
  }, []);

  useLayoutEffect(() => {
    if (focused) {
      inputRef.current.focus({
        cursor: 'end'
      });
    }
  }, [focused]);
  const { t } = useTranslate();

  useEffect(() => {
    setIsInvalid(invalid);
  }, [invalid]);

  useLayoutEffect(() => {
    adjustInputWidth(focused ? displayValue : compactValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjustInputWidth]);

  // eslint-disable-next-line complexity
  const setValue = (newValue: string, element?: any) => {
    const sanitizedValue = sanitizeNumber(newValue);
    const tokenMaxDecimalsOverflow = maxDecimals || 0;
    const isValidNumericValue = validateNumericValue(sanitizedValue, {
      isFloat: allowFloat,
      maxDecimals: tokenMaxDecimalsOverflow?.toString()
    });
    const isValid = sanitizedValue === '' || isValidNumericValue;

    if (isValid) {
      onChange({
        prevValue: value,
        value: sanitizedValue,
        id: coin.id,
        element,
        maxDecimals
      });
      adjustInputWidth(sanitizedValue || placeholderValue);
    }
  };

  const handleChange = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    setValue(target.value, target);
  };

  const setMaxValue = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    event.stopPropagation();
    if (!hasReachedMaxAmount) {
      setValue(max);
    }
  };

  const handleOnBlur = () => {
    setIsTouched(true);
    const currentValue = value && !Number.parseFloat(value) ? placeholderValue : value;
    onBlur({
      value: currentValue,
      id: coin.id,
      maxDecimals
    });
    setFocusInput();
    setFocus(false);
  };

  const handleOnFocus = () => {
    setFocusInput(inputId);
    onFocus?.({
      value,
      id: coin.id,
      maxDecimals
    });
  };

  const handleKeyPress = ({ key }: React.KeyboardEvent<HTMLInputElement>) => {
    if (key === 'Enter') inputRef.current.blur();
  };

  const onBlurError = isTouched ? getErrorMessage(error) : undefined;
  const errorMessage = onBlurErrors?.has(error) ? onBlurError : getErrorMessage(error);

  return (
    <div className={styles.assetInputContainer} data-testid-title={`${coin?.ticker}`} data-testid="coin-configure">
      <div data-testid="coin-configure-info" className={styles.assetConfigRow}>
        <div data-testid="coin-configure-text" onClick={onNameClick} className={styles.tickerContainer}>
          <Tooltip title={coin?.shortTicker && coin.ticker}>
            <span className={styles.ticker}>{coin?.shortTicker || coin?.ticker}</span>
          </Tooltip>
          <Chevron className={styles.icon} />
        </div>

        <div className={styles.amountContainer}>
          {hasMaxBtn && !Number.parseFloat(value) && (
            // There is a span element as children of the button that propagates the click event when the button is disabled, this makes the input element to focus adding 0 as value.
            // To fix this issue, I moved the button click event to a parent div, so, when the button is disabled the event propagation can be stopped.
            <div onClick={setMaxValue}>
              <Button
                data-testid="max-bttn"
                size="small"
                color="secondary"
                className={styles.maxBtn}
                disabled={hasReachedMaxAmount}
              >
                {t('package.core.assetInput.maxButton')}
              </Button>
            </div>
          )}

          <Tooltip title={!isSameNumberFormat(value, compactValue) && !focused && displayValue}>
            <Input
              ref={inputRef}
              data-testid="coin-configure-input"
              placeholder={placeholderValue}
              className={styles.input}
              bordered={false}
              value={focused ? displayValue : compactValue}
              onChange={handleChange}
              max={max}
              onBlur={handleOnBlur}
              onFocus={handleOnFocus}
              onKeyDown={handleKeyPress}
            />
          </Tooltip>
        </div>
      </div>

      <div className={styles.assetBalancesRow}>
        <p data-testid="coin-configure-balance" className={styles.balanceText}>
          {coin.balance}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <p data-testid="coin-configure-fiat-value" className={styles.balanceText}>
            {focused ? fiatValue : formattedFiatValue}
          </p>
        </div>
      </div>
      <div className={styles.assetError}>
        {isInvalid && errorMessage && (
          <span className={styles.invalidInput} data-testid="coin-configure-error-message">
            {t(errorMessage)}
          </span>
        )}
      </div>
    </div>
  );
};
