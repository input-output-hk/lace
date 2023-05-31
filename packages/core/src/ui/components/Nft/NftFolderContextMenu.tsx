import React, { ReactElement, useRef } from 'react';
import styles from './NftFolderContextMenu.module.scss';
import { useOnClickOutside } from '@ui/hooks';

interface NftFolderContextMenuProps {
  x: number;
  y: number;
  closeContextMenu: () => void;
  contextMenuItems: Array<{ label: string; onClick: () => void }>;
}

const NftFolderContextMenu = ({
  x,
  y,
  closeContextMenu,
  contextMenuItems
}: NftFolderContextMenuProps): ReactElement => {
  const contextMenuRef = useRef<HTMLDivElement>();
  useOnClickOutside(contextMenuRef, closeContextMenu);

  return (
    <div ref={contextMenuRef} className={styles.contextMenuContainer} style={{ left: `${x}px`, top: `${y}px` }}>
      {contextMenuItems.map(({ label, onClick }) => (
        <div key={label} onClick={onClick} className={styles.contextMenuItem}>
          {label}
        </div>
      ))}
    </div>
  );
};

export default NftFolderContextMenu;
