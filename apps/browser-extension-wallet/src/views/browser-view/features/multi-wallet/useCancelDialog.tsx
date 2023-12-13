import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Subject } from 'rxjs';

export const useCancelDialog = (
  closeWalletCreation: () => void
): {
  isDialogOpen: boolean;
  setIsDialogOpen: (isOpen: boolean) => void;
  setRef: (instance: HTMLElement) => void;
  closeWithDialog: () => void;
  reset$: Subject<boolean>;
} => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const containerRef = useRef<HTMLElement>(null);
  const inputMap = useMemo(() => new Map<string, boolean>(), []);
  const reset$ = useMemo(() => new Subject<boolean>(), []);

  useEffect(() => {
    const subscription = reset$.subscribe(() => {
      inputMap.clear();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [reset$, inputMap]);

  const handleInputChange = useCallback(
    (event: Event) => {
      inputMap.set((event.target as HTMLInputElement).id, Boolean((event.target as HTMLInputElement).value));
    },
    [inputMap]
  );

  const closeWithDialog = useCallback(() => {
    const shouldOpenDialog = [...inputMap.values()].some(Boolean);
    if (shouldOpenDialog) {
      setIsDialogOpen(true);
    } else {
      closeWalletCreation();
    }
  }, [inputMap, closeWalletCreation, setIsDialogOpen]);

  const setRef: React.RefCallback<HTMLElement> = (node) => {
    if (node) {
      containerRef.current = node;
      node.querySelectorAll('input').forEach((input) => {
        inputMap.set(input.id, Boolean(input.value));
        input.addEventListener('input', handleInputChange);
      });
    } else {
      containerRef.current
        ?.querySelectorAll('input')
        .forEach((input) => input.removeEventListener('input', handleInputChange));
    }
  };

  return {
    isDialogOpen,
    setIsDialogOpen,
    setRef,
    closeWithDialog,
    reset$
  };
};
