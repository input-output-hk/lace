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
  const contextMenuRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(contextMenuRef, closeContextMenu);

  return (
    <div
      data-testid="nft-folder-context-menu"
      ref={contextMenuRef}
      className={styles.contextMenuContainer}
      style={{ left: `${x}px`, top: `${y}px` }}
    >
      {contextMenuItems.map(({ label, onClick }) => (
        <div
          data-testid={`context-menu-item-${label.toLowerCase()}`}
          key={label}
          onClick={onClick}
          className={styles.contextMenuItem}
        >
          {label}
        </div>
      ))}
    </div>
  );
};

export default NftFolderContextMenu;
