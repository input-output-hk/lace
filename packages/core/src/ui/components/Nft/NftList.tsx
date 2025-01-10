import React from 'react';
import cn from 'classnames';
import { v4 as uuidv4 } from 'uuid';
import { NftItem, NftItemProps } from './NftItem';
import {
  NftsItemsTypes,
  NftFolderItem,
  NftPlaceholderItem,
  PlaceholderItem,
  NftFolderItemProps
} from './NftFolderItem';
import styles from './NftList.module.scss';

export interface NftListProps {
  items: Array<NftItemProps | NftFolderItemProps | PlaceholderItem>;
  rows?: number;
}

export const NftList = ({ items, rows }: NftListProps): React.ReactElement => (
  <div data-testid="nft-list" className={cn(styles.nftList, { [styles[`${rows}-rows`]]: rows })}>
    {items.map((props) => {
      if (props.type === NftsItemsTypes.FOLDER) return <NftFolderItem key={props.name} {...props} />;
      if (props.type === NftsItemsTypes.PLACEHOLDER) return <NftPlaceholderItem key={uuidv4()} {...props} />;
      return <NftItem key={props.assetId} {...props} />;
    })}
  </div>
);
