import { useState } from 'react';
import { ValidationStatus } from '@lace/ui';
import { CoSigner, ValidateAddress } from './type';

interface UseCoSignerInput {
  errorString: string;
  onChange: (coSigner: CoSigner) => void;
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
        onChange({ address: '', isValid: false });
        setValidationStatus(ValidationStatus.Idle);
        setErrorMessage('');
        return;
      }
      setValidationStatus(ValidationStatus.Validading);
      const result = await validateAddress(value);

      if (result.isValid) {
        onChange({ address: result.handleResolution || value, isValid: true });
        setValidationStatus(ValidationStatus.Validated);
        setErrorMessage('');
      } else {
        onChange({ address: value, isValid: false });
        setValidationStatus(ValidationStatus.Idle);
        setErrorMessage(errorString);
      }
    }
  };
};
