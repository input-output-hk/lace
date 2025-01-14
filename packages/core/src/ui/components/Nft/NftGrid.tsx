import { GridProps, VirtualisedGrid } from '@lace/common';
import React, { useCallback } from 'react';
import {
  NftFolderItem,
  NftFolderItemProps,
  NftPlaceholderItem,
  NftsItemsTypes,
  PlaceholderItem
} from './NftFolderItem';

import { NftItem, NftItemProps } from './NftItem';

export type NftGridProps = Omit<GridProps<NftItemProps | NftFolderItemProps | PlaceholderItem>, 'itemContent'> & {
  isSearching?: boolean;
};

export const NftGrid = ({
  items,
  scrollableTargetId = '',
  tableReference,
  columns,
  ...props
}: NftGridProps): React.ReactElement => {
  const itemContent = useCallback(
    (index: number, data: NftItemProps | NftFolderItemProps | PlaceholderItem): React.ReactElement => {
      if (data?.type === NftsItemsTypes.FOLDER) return <NftFolderItem key={index} {...data} />;
      if (data?.type === NftsItemsTypes.PLACEHOLDER) return <NftPlaceholderItem key={index} {...data} />;
      return <NftItem key={index} {...data} />;
    },
    []
  );

  return (
    <VirtualisedGrid<NftItemProps | NftFolderItemProps | PlaceholderItem>
      testId="nfts-list-scroll-wrapper"
      columns={columns}
      tableReference={tableReference}
      scrollableTargetId={scrollableTargetId}
      items={items}
      totalCount={items?.length}
      itemContent={itemContent}
      {...props}
    />
  );
};
