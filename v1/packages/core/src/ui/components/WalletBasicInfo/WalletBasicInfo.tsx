/* eslint-disable react/no-multi-comp */
import React from 'react';
import { WalletAvatar, WalletAvatarProps } from '../WalletAvatar';
import styles from './WalletBasicInfo.module.scss';
import { TranslationsFor } from '@ui/utils/types';

export type WalletBasicInfoProps = {
  balance: string;
  withLabel?: boolean;
  translations: TranslationsFor<'balance'>;
} & Omit<WalletAvatarProps, 'children'>;

export const WalletBasicInfo = ({
  balance,
  withLabel = true,
  translations,
  ...rest
}: WalletBasicInfoProps): React.ReactElement => (
  <div data-testid="wallet-basic-info" className={styles.walletInfoContainer}>
    <WalletAvatar {...rest} />
    <div className={styles.balanceContainer} data-testid="basic-info-balance">
      {withLabel && (
        <h6 className={styles.label} data-testid="label">
          {translations.balance}
        </h6>
      )}
      <p data-testid="balance" className={styles.amount}>
        {balance}
      </p>
    </div>
  </div>
);
