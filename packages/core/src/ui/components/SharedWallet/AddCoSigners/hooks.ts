import { useState } from 'react';
import { ValidationStatus } from '@lace/ui';
import { CoSigner, ValidateAddress } from './type';
import { v1 as uuid } from 'uuid';

export const useCoSigners = (): {
  coSigners: CoSigner[];
  updateCoSigner: (index: number, coSigner: CoSigner) => void;
} => {
  const [coSigners, setCoSigners] = useState<CoSigner[]>([
    { address: '', isValid: false, id: uuid() },
    { address: '', isValid: false, id: uuid() }
  ]);

  return {
    coSigners,
    updateCoSigner: (index: number, coSigner: CoSigner) => {
      coSigners[index] = coSigner;
      setCoSigners([...coSigners]);
    }
  };
};

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
