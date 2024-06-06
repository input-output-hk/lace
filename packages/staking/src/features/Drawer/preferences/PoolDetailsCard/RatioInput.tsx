import { Box } from '@lace/ui';
import React, { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { PERCENTAGE_SCALE_MAX } from 'features/store/delegationPortfolioStore/constants';
import * as styles from './RatioInput.css';

type RatioInputProps = {
  onUpdate: (value: number) => void;
  onClick?: () => void;
  value: number;
};

const isInputANumber = (value: string) => /^\d{0,3}$/.test(value);

export const RatioInput = ({ onUpdate, onClick, value }: RatioInputProps) => {
  const [localValue, setLocalValue] = useState(String(value));
  const lastValueOfValue = useRef(value);

  const validateAndUpdate = useCallback(() => {
    let percentageValue = Number(localValue);
    if (!percentageValue || percentageValue < 1) {
      percentageValue = 1;
    } else if (percentageValue > PERCENTAGE_SCALE_MAX) {
      percentageValue = PERCENTAGE_SCALE_MAX;
    }
    setLocalValue(String(percentageValue));
    if (percentageValue === value) return;
    onUpdate(percentageValue);
  }, [localValue, onUpdate, value]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!isInputANumber(event.target.value)) return;
    setLocalValue(event.target.value);
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') validateAndUpdate();
  };

  useEffect(() => {
    if (value === lastValueOfValue.current) return;
    setLocalValue(String(value));
    lastValueOfValue.current = value;
  }, [value]);

  return (
    <Box className={styles.inputContainer}>
      <input
        type="text"
        className={styles.input}
        max={PERCENTAGE_SCALE_MAX}
        value={localValue}
        onClick={onClick}
        onChange={handleChange}
        onKeyDown={handleKeyPress}
        onBlur={validateAndUpdate}
        data-testid="pool-details-card-ratio-input"
      />
    </Box>
  );
};
