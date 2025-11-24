/* eslint-disable react/no-multi-comp */
import React, { MouseEvent, useLayoutEffect, useRef, useState } from 'react';
import { NftImage } from './NftImage';
import { ReactComponent as SelectedIcon } from '../../assets/icons/check-token-icon.svg';
import styles from './NftItem.module.scss';
import { getContextMenuPoints, NftsItemsTypes } from './NftFolderItem';
import { useOnClickOutside } from '@src/ui/hooks';

export interface ContextMenuProps {
  setClicked?: (isClicked: boolean) => void;
  children?: React.ReactElement;
  points: { x: number; y: number };
}

const ContextMenu = ({ setClicked, children, points }: ContextMenuProps) => {
  const contextRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(contextRef, () => setClicked?.(false));

  return (
    <div
      data-testid="portal"
      onContextMenu={() => {
        setClicked?.(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        setClicked?.(false);
      }}
      ref={contextRef}
      className={styles.contextMenu}
      style={{ top: points.y, left: points.x }}
    >
      {children}
    </div>
  );
};

export type NftItemProps = {
  id?: string;
  assetId?: string;
  image?: string;
  name: string;
  onClick?: () => void;
  amount?: number | string;
  selected?: boolean;
  type?: NftsItemsTypes.NFT;
  contextMenu?: React.ReactElement;
};

export const NftItem = ({ image, name, onClick, amount, selected, contextMenu }: NftItemProps): React.ReactElement => {
  const bodyRef = useRef<{ clientWidth?: number }>({ clientWidth: 0 });
  const [clicked, setClicked] = useState(false);
  const [points, setPoints] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useLayoutEffect(() => {
    const bodyElement = document.querySelector('body');
    if (!bodyElement) return;
    const { clientWidth } = bodyElement;
    bodyRef.current = { clientWidth };
  }, []);

  const onContextMenu = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!contextMenu) return;
    e.preventDefault();
    setPoints(getContextMenuPoints(e));
    setClicked(true);
  };

  return (
    <a data-testid="nft-item" className={styles.nftItem} onClick={onClick} onContextMenu={onContextMenu}>
      {Number(amount) > 1 && (
        <div data-testid="nft-item-amount" className={styles.amount}>
          {amount}
        </div>
      )}
      {selected && SelectedIcon && <SelectedIcon className={styles.selectedIcon} data-testid="nft-item-selected" />}
      <div data-testid="nft-item-img-container" className={styles.imageWrapper}>
        {selected && <div className={styles.overlay} data-testid="nft-item-overlay" />}
        <NftImage withBorder image={image} />
      </div>
      <p className={styles.name} data-testid="nft-item-name">
        {name}
      </p>
      {clicked && (
        <ContextMenu setClicked={setClicked} points={points}>
          {contextMenu}
        </ContextMenu>
      )}
    </a>
  );
};
