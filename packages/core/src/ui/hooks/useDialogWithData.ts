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
  const [dialogData, setDialogData] = useState<Data>(initialData);

  return {
    data: dialogData,
    isOpen: dialogData !== undefined,
    setData: setDialogData,
    open: (data?: Data) => {
      setDialogData(data);
    },
    hide: () => {
      // eslint-disable-next-line unicorn/no-useless-undefined
      setDialogData(undefined);
    }
  };
};
