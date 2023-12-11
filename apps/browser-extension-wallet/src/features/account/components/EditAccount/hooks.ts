import { useState } from 'react';

export const useEditAccountDrawer = (): { isOpen: boolean; open: () => void; hide: () => void } => {
  const [visible, setVisible] = useState(false);

  return {
    isOpen: visible,
    open: () => setVisible(true),
    hide: () => setVisible(false)
  };
};
