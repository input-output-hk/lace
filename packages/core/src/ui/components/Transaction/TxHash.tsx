import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import { TransactionDetailsProps } from './types';
import styles from '../ActivityDetail/TransactionDetails.module.scss';
import { CopiableHash } from './CopiableHash';

type TxHashProps = {
  success: boolean;
  sending: boolean;
  openLink: TransactionDetailsProps['handleOpenExternalHashLink'];
} & Pick<TransactionDetailsProps, 'hash'>;

export const TxHash = ({ hash, success, sending, openLink }: TxHashProps): React.ReactElement => {
  const { t } = useTranslation();
  const hashComponent = useMemo(
    () =>
      hash ? (
        sending ? (
          <CopiableHash hash={hash} copiedText={t('core.activityDetails.copiedToClipboard')} />
        ) : (
          hash
        )
      ) : undefined,
    [hash, sending]
  );

  return (
    <div data-testid="tx-hash" className={styles.hashContainer}>
      <div className={cn(styles.title, styles.labelWidth)}>
        <div className={styles.hashLabel} data-testid="tx-hash-title">
          {t('core.activityDetails.transactionID')}
        </div>
      </div>
      <div
        data-testid="tx-hash-detail"
        className={cn(styles.detail, {
          [styles.hash]: openLink,
          [styles.txLink]: success && !!openLink
        })}
        onClick={openLink}
      >
        {hashComponent && <div>{hashComponent}</div>}
      </div>
    </div>
  );
};
