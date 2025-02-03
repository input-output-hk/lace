import React from 'react';
import cn from 'classnames';
import { Spin } from 'antd';
import { useFetchImage } from '@lace/common';
import NFTPlaceholderImage from '../../assets/images/nft-placeholder.png';
import styles from './NftImage.module.scss';

export interface NftImageProps {
  image?: string;
  popupView?: boolean;
  detailView?: boolean;
  withBorder?: boolean;
}

export const NftImage = ({
  image = NFTPlaceholderImage,
  popupView = false,
  detailView = false,
  withBorder = false
}: NftImageProps): React.ReactElement => {
  const imageResponse = useFetchImage({ url: image, fallbackImage: NFTPlaceholderImage });

  if (imageResponse?.status === 'loading')
    return (
      <div className={styles.spinnerContainer}>
        <Spin />
      </div>
    );

  return (
    <img
      className={cn(styles.nftImage, {
        [styles.popupView]: popupView,
        [styles.detailView]: detailView,
        [styles.border]: withBorder
      })}
      data-testid={'nft-image'}
      alt="NFT"
      src={imageResponse.imageSrc}
    />
  );
};
