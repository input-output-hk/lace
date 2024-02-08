import { useState } from 'react';
import { AutoSuggestBox } from '@lace/ui';
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
  validationStatus: AutoSuggestBox.ValidationStatus;
  onInputChange: (address: string) => Promise<void>;
} => {
  const [validationStatus, setValidationStatus] = useState(AutoSuggestBox.ValidationStatus.Idle);
  const [errorMessage, setErrorMessage] = useState('');

  return {
    errorMessage,
    validationStatus,
    onInputChange: async (value: string) => {
      if (!value) {
        onChange({ address: '', isValid: false });
        setValidationStatus(AutoSuggestBox.ValidationStatus.Idle);
        setErrorMessage('');
        return;
      }
      setValidationStatus(AutoSuggestBox.ValidationStatus.Validading);
      const result = await validateAddress(value);

      if (result.isValid) {
        onChange({ address: result.handleResolution || value, isValid: true });
        setValidationStatus(AutoSuggestBox.ValidationStatus.Validated);
        setErrorMessage('');
      } else {
        onChange({ address: value, isValid: false });
        setValidationStatus(AutoSuggestBox.ValidationStatus.Idle);
        setErrorMessage(errorString);
      }
    }
  };
};
