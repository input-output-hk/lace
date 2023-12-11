import React, { useCallback, useEffect, useRef, useState } from 'react';

export const useCancelDialog = (
  closeWalletCreation: () => void
): {
  isDialogOpen: boolean;
  setIsDialogOpen: (isOpen: boolean) => void;
  setRef: (instance: HTMLElement) => void;
  closeWithDialog: () => void;
  withReset: (WrappedComponent: React.FC) => () => JSX.Element;
} => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const shouldOpenDialogRef = useRef(false);
  const containerRef = useRef<HTMLElement>(null);

  const handleInputChange = useCallback(() => {
    shouldOpenDialogRef.current = true;
  }, []);

  const closeWithDialog = useCallback(() => {
    if (shouldOpenDialogRef.current) {
      setIsDialogOpen(true);
    } else {
      closeWalletCreation();
    }
  }, [closeWalletCreation, setIsDialogOpen]);

  const setRef: React.RefCallback<HTMLElement> = (node) => {
    if (node) {
      containerRef.current = node;
      node.querySelectorAll('input').forEach((input) => input.addEventListener('input', handleInputChange));
    } else {
      containerRef.current
        ?.querySelectorAll('input')
        .forEach((input) => input.removeEventListener('input', handleInputChange));
    }
  };

  const withReset = useCallback((WrappedComponent: React.FC) => {
    const WithReset = () => {
      useEffect(() => {
        shouldOpenDialogRef.current = false;
      }, []);

      return <WrappedComponent />;
    };

    WithReset.displayName = `withReset(${WrappedComponent.displayName || WrappedComponent.name})`;
    return WithReset;
  }, []);

  return {
    isDialogOpen,
    setIsDialogOpen,
    setRef,
    closeWithDialog,
    withReset
  };
};
