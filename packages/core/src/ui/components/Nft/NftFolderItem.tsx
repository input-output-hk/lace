/* eslint-disable react/no-multi-comp */
/* eslint-disable unicorn/numeric-separators-style */
import React from 'react';
import cn from 'classnames';
import { NftImage, NftImageProps } from './NftImage';
import styles from './NftItem.module.scss';
import { Tooltip } from 'antd';
import NftFolderContextMenu from './NftFolderContextMenu';

export enum NftsItemsTypes {
  FOLDER = 'folder',
  NFT = 'nft',
  PLACEHOLDER = 'placeholder'
}

export type NftFolderItemProps = {
  nfts?: Array<NftImageProps & { assetId?: string }>;
  name: string;
  id?: number;
  onClick?: () => void;
  type: NftsItemsTypes.FOLDER;
  contextMenuItems?: Array<{ label: string; onClick: () => void }>;
};

const numberOfNftsToShow = 4;
const maxRestOfNftsNumber = 9999;

const initialContextMenu = {
  show: false,
  x: 0,
  y: 0
};

const contextMenuWidth = 200;

export const NftFolderItem = ({ name, onClick, nfts, contextMenuItems }: NftFolderItemProps): React.ReactElement => {
  const restOfNfts = (nfts?.length ?? 0) - numberOfNftsToShow + 1;
  const [contextMenu, setContextMenu] = React.useState(initialContextMenu);

  const shouldShowCompactNumber = restOfNfts > maxRestOfNftsNumber;
  const restOfNftsContent = (
    <Tooltip
      className={styles.restOfNftsNumber}
      visible={!shouldShowCompactNumber ? false : undefined}
      placement="top"
      title={`+${restOfNfts}`}
    >
      <span data-testid="rest-of-nfts">+{restOfNfts}</span>
    </Tooltip>
  );

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const { pageX, pageY } = e;
    return pageX < window.innerWidth - contextMenuWidth
      ? setContextMenu({ show: true, x: pageX, y: pageY })
      : setContextMenu({ show: true, x: pageX - contextMenuWidth, y: pageY });
  };

  return (
    <div onContextMenu={handleContextMenu}>
      {contextMenu.show && contextMenuItems && (
        <NftFolderContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          closeContextMenu={() => setContextMenu(initialContextMenu)}
          contextMenuItems={contextMenuItems}
        />
      )}

      <a onClick={onClick} data-testid="folder-item" className={styles.nftItem}>
        <div className={styles.folderWrapper}>
          {nfts?.slice(0, numberOfNftsToShow).map(({ image }, index) =>
            index === numberOfNftsToShow - 1 && nfts.length > numberOfNftsToShow ? (
              <div className={styles.restOfNfts}>{restOfNftsContent}</div>
            ) : (
              <div data-testid="nft-item-img-container" key={image} className={styles.imageWrapper}>
                <NftImage image={image} />
              </div>
            )
          )}
        </div>
        <p className={styles.name} data-testid="nft-item-name">
          {name}
        </p>
      </a>
    </div>
  );
};

export type PlaceholderItem = {
  type: NftsItemsTypes.PLACEHOLDER;
  children?: React.ReactElement;
  onClick: () => void;
};

export const NftPlaceholderItem = ({ children, onClick }: PlaceholderItem): React.ReactElement => (
  <a onClick={onClick} data-testid="placeholder-item" className={cn(styles.nftItem, styles.placeholder)}>
    <div className={styles.container}>
      <div className={styles.content}>{children}</div>
    </div>
    <div />
  </a>
);
