import React from 'react';
import cn from 'classnames';
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
    {items.map((props, index) => {
      if (props.type === NftsItemsTypes.FOLDER) return <NftFolderItem key={index} {...props} />;
      if (props.type === NftsItemsTypes.PLACEHOLDER) return <NftPlaceholderItem key={index} {...props} />;
      return <NftItem key={index} {...props} />;
    })}
  </div>
);
