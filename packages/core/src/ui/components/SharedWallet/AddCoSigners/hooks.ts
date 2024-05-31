import { useState } from 'react';
import { ValidationStatus } from '@lace/ui';
import { ValidateAddress } from './type';

interface UseCoSignerInput {
  errorString: string;
  onChange: (address: string, isValid: boolean) => void;
  validateAddress: ValidateAddress;
}

export const useCoSignerInput = ({
  errorString,
  validateAddress,
  onChange
}: UseCoSignerInput): {
  errorMessage: string;
  validationStatus: ValidationStatus;
  onInputChange: (address: string) => Promise<void>;
} => {
  const [validationStatus, setValidationStatus] = useState(ValidationStatus.Idle);
  const [errorMessage, setErrorMessage] = useState('');

  return {
    errorMessage,
    validationStatus,
    onInputChange: async (value: string) => {
      if (!value) {
        onChange(value, false);
        setValidationStatus(ValidationStatus.Idle);
        setErrorMessage('');
        return;
      }
      setValidationStatus(ValidationStatus.Validating);
      const result = validateAddress(value);

      if (result.isValid) {
        onChange(value, true);
        setValidationStatus(ValidationStatus.Validated);
        setErrorMessage('');
      } else {
        onChange(value, false);
        setValidationStatus(ValidationStatus.Idle);
        setErrorMessage(errorString);
      }
    }
  };
};
