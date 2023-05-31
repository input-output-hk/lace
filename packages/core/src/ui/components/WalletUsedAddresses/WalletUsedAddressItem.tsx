import React from 'react';
import cn from 'classnames';
import { Ellipsis, Button, toast } from '@lace/common';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { TranslationsFor } from '@ui/utils/types';
import { ReactComponent as CopyIcon } from '../../assets/icons/copy-icon.svg';
import styles from './WalletUsedAddressItem.module.scss';

export interface ItemSchema {
  id: number;
  address: string;
}

export type WalletUsedAddressItemProps = {
  className?: string;
  translations: TranslationsFor<'addressCopied' | 'copy'>;
} & ItemSchema;

export const WalletUsedAddressItem = ({
  address,
  className,
  translations
}: WalletUsedAddressItemProps): React.ReactElement => (
  <div data-testid={`used-address-list-item-${address}`} className={cn(styles.listItemContainer, { className })}>
    <Ellipsis
      dataTestId="address-list-item-address"
      text={address}
      textClassName={styles.textField}
      className={cn(styles.listItemBlock, styles.listItemAddress)}
      withTooltip={false}
      ellipsisInTheMiddle
    />
    <div className={styles.copyBtnBlock}>
      <CopyToClipboard text={address}>
        <Button
          className={styles.copyBtn}
          color="secondary"
          onClick={() =>
            toast.notify({
              text: translations.addressCopied,
              icon: CopyIcon
            })
          }
          data-testid="copy-address-btn"
        >
          {translations.copy}
        </Button>
      </CopyToClipboard>
    </div>
  </div>
);
