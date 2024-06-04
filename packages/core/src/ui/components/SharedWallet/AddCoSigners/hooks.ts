import { useState } from 'react';
import { ValidationStatus } from '@lace/ui';

type ValidateAddress = (address: string) => { isValid: boolean };
type CoSigner = {
  id: string;
  name: {
    value: string;
    isValid: boolean;
  };
  address: {
    value: string;
    isValid: boolean;
  };
};

interface UseCoSignerInput {
  errorString: { name: string; address: string };
  onChange: ({ name, address }: Omit<CoSigner, 'id'>) => void;
  validateAddress: ValidateAddress;
}

export const useCoSignerInput = ({
  errorString,
  validateAddress,
  onChange
}: UseCoSignerInput): {
  errorMessage: { name: string; address: string };
  validationStatus: ValidationStatus;
  onInputChange: (name: string, address: string) => void;
} => {
  const [validationStatus, setValidationStatus] = useState(ValidationStatus.Idle);
  const [errorMessage, setErrorMessage] = useState({
    name: '',
    address: ''
  });

  return {
    errorMessage,
    validationStatus,
    onInputChange: (name: string, address: string) => {
      if (!name && !address) {
        onChange({ name: { value: '', isValid: false }, address: { value: '', isValid: false } });
        setValidationStatus(ValidationStatus.Idle);
        setErrorMessage({ name: '', address: '' });
        return;
      }
      setValidationStatus(ValidationStatus.Validating);
      const isAddressValid = validateAddress(address);
      const isNameValid = name.length > 0;

      if (isAddressValid && isNameValid) {
        setValidationStatus(ValidationStatus.Validated);
        setErrorMessage({ name: '', address: '' });
        onChange({ name: { value: name, isValid: true }, address: { value: address, isValid: true } });
      } else {
        setValidationStatus(ValidationStatus.Idle);
        setErrorMessage({
          name: isNameValid ? '' : errorString.name,
          address: isAddressValid ? '' : errorString.address
        });
        onChange({
          name: { value: name, isValid: isNameValid },
          address: { value: address, isValid: isAddressValid.isValid }
        });
      }
    }
  };
};
