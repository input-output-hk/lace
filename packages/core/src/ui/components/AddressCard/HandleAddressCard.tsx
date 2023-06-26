import React, { useEffect } from 'react';
import styles from './HandleAddressCard.module.scss';
import { Image, Spin } from 'antd';
import { Base } from './Base';
import symbol from '../../assets/images/handle.png';
import placeholder from '../../assets/images/nft-placeholder.png';
import { IMAGE_FETCH_STATUS, useFetchImage } from '@lace/common';

export type Props = {
  name: string;
  image: string;
  copiedMessage: string;
};

export const HandleAddressCard = ({ name, image, copiedMessage }: Readonly<Props>): JSX.Element => {
  const [imageResponse, handleLoad] = useFetchImage({ url: image, fallback: placeholder });
  const isLoading = imageResponse?.status === IMAGE_FETCH_STATUS.LOADING;

  useEffect(() => {
    handleLoad();
  }, [handleLoad]);

  return (
    <Base copiedMessage={copiedMessage} copyText={name}>
      <div className={styles.imageContainer}>
        {isLoading ? (
          <Spin />
        ) : (
          <Image className={styles.image} data-testid="address-card-handle-image" preview={false} src={image} />
        )}
      </div>
      <div className={styles.pillContainer}>
        <div className={styles.pill}>
          <div className={styles.symbol}>
            <Image preview={false} src={symbol} />
          </div>
          <div className={styles.name} data-testid="address-card-handle-name">
            {name}
          </div>
        </div>
      </div>
    </Base>
  );
};
