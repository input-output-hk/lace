/* eslint-disable react/no-multi-comp */
import React, { MouseEvent, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { NftImage } from './NftImage';
import { ReactComponent as SelectedIcon } from '../../assets/icons/check-token-icon.svg';
import styles from './NftItem.module.scss';
import { NftsItemsTypes } from './NftFolderItem';

export interface ContextMenuProps {
  setClicked?: (isClicked: boolean) => void;
  children?: React.ReactElement;
  onRender?: (width: number) => void;
  points: { x: number; y: number };
}

const ContextMenu = ({ setClicked, children, onRender, points }: ContextMenuProps) => {
  const contextRef = useRef<HTMLDivElement>();
  const [width, setWidth] = useState<number>(0);

  useLayoutEffect(() => {
    if (contextRef?.current) {
      const contentWidth = contextRef?.current?.clientWidth;
      if (width === contentWidth) return;
      onRender(contextRef?.current?.clientWidth);
      setWidth(contentWidth);
    }
  }, [onRender, contextRef, width]);

  return (
    <div
      onContextMenu={() => {
        setClicked(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        setClicked(false);
      }}
      className={styles.portal}
    >
      <div ref={contextRef} className={styles.contextMenu} style={{ top: points.y, right: points.x }}>
        {children}
      </div>
    </div>
  );
};

export interface NftItemProps {
  assetId?: string;
  image?: string;
  name: string;
  onClick?: () => void;
  amount?: number | string;
  selected?: boolean;
  type?: NftsItemsTypes.NFT;
  contextMenu?: React.ReactElement;
}

export const NftItem = ({ image, name, onClick, amount, selected, contextMenu }: NftItemProps): React.ReactElement => {
  const bodyRef = useRef<{ clientWidth?: number }>({ clientWidth: 0 });
  const [clicked, setClicked] = useState(false);
  const [points, setPoints] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const repositionContextMenu = useCallback(
    (contextWidth: number) => {
      // checks if context menu could be placed at the right of the cursor
      const { clientWidth } = document.querySelector('body');
      if (contextWidth < points.x)
        setPoints((prevPoints) => ({
          ...prevPoints,
          x: prevPoints.x - contextWidth
        }));
      // checks if context menu is not beyond the container
      else if (contextWidth + points.x > clientWidth)
        setPoints((prevPoints) => ({
          ...prevPoints,
          x: prevPoints.x - (contextWidth - (clientWidth - prevPoints.x))
        }));
    },
    [points]
  );

  useLayoutEffect(() => {
    const { clientWidth } = document.querySelector('body');
    bodyRef.current = { clientWidth };
  }, []);

  const onContextMenu = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!contextMenu) return;
    e.preventDefault();
    const { clientWidth } = document.querySelector('body');
    setPoints({
      x: clientWidth - e.pageX,
      y: e.pageY
    });
    setClicked(true);
  };

  return (
    <>
      <a data-testid="nft-item" className={styles.nftItem} onClick={onClick} onContextMenu={onContextMenu}>
        {Number(amount) > 1 && (
          <div data-testid="nft-item-amount" className={styles.amount}>
            {amount}
          </div>
        )}
        {selected && SelectedIcon && <SelectedIcon className={styles.selectedIcon} />}
        <div data-testid="nft-item-img-container" className={styles.imageWrapper}>
          {selected && <div className={styles.overlay} />}
          <NftImage image={image} />
        </div>
        <p className={styles.name} data-testid="nft-item-name">
          {name}
        </p>
      </a>
      {clicked && (
        <ContextMenu setClicked={setClicked} points={points} onRender={repositionContextMenu}>
          {contextMenu}
        </ContextMenu>
      )}
    </>
  );
};
