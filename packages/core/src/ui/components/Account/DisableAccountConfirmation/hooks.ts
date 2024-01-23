import { useCallback, useState } from 'react';

export const useDisableAccountConfirmation = (): {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
} => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return {
    isOpen,
    setIsOpen: useCallback(
      (value: boolean) => {
        setIsOpen(value);
      },
      [setIsOpen]
    )
  };
};
