import React, { useRef } from 'react';
import styles from './PinCodeInput.module.scss';

type PinCodeInputValuePartType = number | undefined;
export type PinCodeInputValueType = PinCodeInputValuePartType[];

export interface PinCodeInputProps {
  value: PinCodeInputValueType;
  onChange: (value: PinCodeInputValueType) => void;
}

export const PinCodeInput = ({ value, onChange }: PinCodeInputProps): React.ReactElement => {
  const inputsRefs = useRef<HTMLInputElement[]>([]);

  return (
    <div className={styles.pinCodeContainer}>
      {value.map((valuePart, index) => (
        <input
          className={styles.pinCodeInput}
          ref={(element) => {
            if (element) {
              inputsRefs.current[index] = element;
            }
          }}
          onChange={({ target: { value: valuePartString } }) => {
            const [firstCharacter] = valuePartString;
            const newValuePartAsNumber = Number(firstCharacter);
            const newValuePart = Number.isNaN(newValuePartAsNumber) ? undefined : newValuePartAsNumber;

            const newValue = [...value];
            newValue[index] = newValuePart;
            onChange(newValue);

            if (newValuePart !== undefined) {
              const nextInput = inputsRefs.current[index + 1];
              nextInput?.focus();
            }
          }}
          key={index}
          value={valuePart === undefined ? '' : valuePart}
          autoComplete="off"
        />
      ))}
    </div>
  );
};
