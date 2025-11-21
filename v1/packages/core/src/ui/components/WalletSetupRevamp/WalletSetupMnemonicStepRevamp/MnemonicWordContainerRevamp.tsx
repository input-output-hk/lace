/* eslint-disable react/prop-types */
/* eslint-disable no-magic-numbers */
import React, { forwardRef } from 'react';
import styles from './MnemonicWordContainerRevamp.module.scss';
import classnames from 'classnames';

export interface MnemonicWordContainerProps {
  children: React.ReactNode;
  number: number;
  active?: boolean;
  onContextMenu?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  disabled?: boolean;
  className?: string;
}

export const MnemonicWordContainerRevamp = forwardRef<HTMLDivElement, MnemonicWordContainerProps>(
  ({ children, number, active, onContextMenu, disabled, className }, ref) => (
    <div
      data-testid="mnemonic-word-container"
      ref={ref}
      className={classnames(styles.mnemonicWordContainer, className, {
        [styles.active]: active,
        [styles.disabled]: disabled
      })}
      onCopy={(e) => {
        e.preventDefault();
        return false;
      }}
      onContextMenu={onContextMenu}
    >
      <p onContextMenu={onContextMenu} className={styles.number}>
        {number}.
      </p>
      {children}
    </div>
  )
);
