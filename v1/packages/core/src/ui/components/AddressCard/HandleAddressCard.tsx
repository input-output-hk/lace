import React from 'react';
import styles from './HandleAddressCard.module.scss';
import { Image, Spin } from 'antd';
import { Base } from './Base';
import symbol from '../../assets/images/handle.png';
import placeholder from '../../assets/images/nft-placeholder.png';
import { useFetchImage } from '@lace/common';

export type Props = {
  name: string;
  image: string;
  copiedMessage: string;
  onCopyClick?: () => void;
};

export const HandleAddressCard = ({ name, image, copiedMessage, onCopyClick }: Readonly<Props>): JSX.Element => {
  const imageResponse = useFetchImage({ url: image, fallbackImage: placeholder });
  const isLoading = imageResponse?.status === 'loading';

  return (
    <Base copiedMessage={copiedMessage} copyText={name} onCopyClick={onCopyClick}>
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
            <Image data-testid="address-card-handle-symbol" preview={false} src={symbol} />
          </div>
          <div className={styles.name} data-testid="address-card-handle-name">
            {name}
          </div>
        </div>
      </div>
    </Base>
  );
};
