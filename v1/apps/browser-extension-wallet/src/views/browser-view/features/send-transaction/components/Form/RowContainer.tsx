import React, { useEffect, useRef } from 'react';
import styles from './RowContainer.module.scss';

interface Props {
  children: React.ReactNode;
  id: string;
  focusRow?: string;
  isBundle?: boolean;
}

export const RowContainer = ({ children, id, focusRow, isBundle }: Props): React.ReactElement => {
  const ref = useRef<HTMLDivElement>();

  useEffect(() => {
    if (focusRow === id || isBundle) {
      ref.current?.scrollIntoView(false);
    }
  }, [focusRow, id, isBundle]);

  return (
    <div ref={ref} className={styles.outputRowContainer} data-testid="asset-bundle-container">
      {children}
    </div>
  );
};
