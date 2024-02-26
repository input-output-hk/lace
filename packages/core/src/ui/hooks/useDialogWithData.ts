import { useState } from 'react';

export const useDialogWithData = <Data>(
  initialData?: Data
): {
  data: Data;
  isOpen: boolean;
  setData: (data: Data) => void;
  open: (data?: Data) => void;
  hide: () => void;
} => {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<Data>(initialData);

  return {
    data,
    isOpen,
    setData,
    open: (d?: Data) => {
      setIsOpen(true);
      if (d !== undefined) setData(d);
    },
    hide: () => {
      setIsOpen(false);
    }
  };
};
