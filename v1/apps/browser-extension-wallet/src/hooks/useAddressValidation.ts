import { useEffect, useState } from 'react';
import { ValidationResult } from '../types';
import { isValidAddress } from '@src/utils/validators';

export const useAddressValidation = (address: string): ValidationResult => {
  const [valid, setIsValid] = useState<boolean>(false);

  useEffect(() => {
    setIsValid(isValidAddress(address));
  }, [address]);

  return {
    valid
  };
};
