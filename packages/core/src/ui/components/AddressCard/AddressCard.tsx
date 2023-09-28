import React, { useMemo } from 'react';
import { QRCode, QRCodeProps, addEllipsis } from '@lace/common';
import styles from './AddressCard.module.scss';
import { Base } from './Base';

export type Props = {
  address: string;
  copiedMessage: string;
  name: string;
  isPopupView?: boolean;
  getQRCodeOptions?: () => QRCodeProps['options'];
  onCopyClick?: () => void;
};

export const ADDRESS_CARD_QR_CODE_SIZE = 130;
export const ADDRESS_CARD_QR_CODE_SIZE_POPUP = 104;
const ADDRESS_FIRST_PART_LENGTH = 7;
const ADDRESS_LAST_PART_LENGTH = 8;

export const AddressCard = ({
  address,
  copiedMessage,
  name,
  isPopupView,
  getQRCodeOptions,
  onCopyClick
}: Readonly<Props>): JSX.Element => (
  <Base copiedMessage={copiedMessage} copyText={address} onCopyClick={onCopyClick}>
    <div className={styles.qrCodeContainer} data-testid="address-card-qr-code-container">
      <QRCode data={address} options={useMemo(() => getQRCodeOptions?.(), [getQRCodeOptions])} />
    </div>
    <div className={styles.infoContainer}>
      <h6 className={styles.name} data-testid="address-card-name">
        {name}
      </h6>
      <p className={styles.address} data-testid="address-card-address">
        {isPopupView ? addEllipsis(address, ADDRESS_FIRST_PART_LENGTH, ADDRESS_LAST_PART_LENGTH) : address}
      </p>
    </div>
  </Base>
);
