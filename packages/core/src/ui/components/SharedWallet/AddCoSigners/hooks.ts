import { useState } from 'react';
import { ValidationStatus } from '@lace/ui';
import { CoSigner, ValidateAddress } from './type';
import { v1 as uuid } from 'uuid';

export const useCoSigners = (): {
  coSigners: CoSigner[];
  removeCoSigner: (index: number) => void;
  updateCoSigner: (index: number, coSigner: CoSigner) => void;
  addCoSigner: () => void;
} => {
  const [coSigners, setCoSigners] = useState<CoSigner[]>([
    { address: '', isValid: true, id: uuid() },
    { address: '', isValid: true, id: uuid() }
  ]);

  return {
    coSigners,
    removeCoSigner: (index) => {
      setCoSigners([...coSigners.filter((_, i) => i !== index)]);
    },
    updateCoSigner: (index: number, coSigner: CoSigner) => {
      coSigners[index] = coSigner;
      setCoSigners([...coSigners]);
    },
    addCoSigner: () => {
      setCoSigners([...coSigners, { address: '', isValid: false, id: uuid() }]);
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
      const result = await validateAddress(value);

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
