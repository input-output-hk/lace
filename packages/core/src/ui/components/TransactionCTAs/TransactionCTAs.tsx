import React from 'react';
import classnames from 'classnames';
import { Button } from '@lace/common';
import styles from './TransactionCTAs.module.scss';
import { ReactComponent as ArrowDiagonalDown } from '../../assets/icons/arrow-diagonal-down.component.svg';
import { ReactComponent as ArrowDiagonalUp } from '../../assets/icons/arrow-diagonal-up.component.svg';
import { useTranslation } from 'react-i18next';

export interface TransactionCTAsProps {
  onReceiveClick: () => void;
  onSendClick: () => void;
  onCoSignClick?: () => void;
  popupView?: boolean;
  buttonClassName?: string;
}

export const TransactionCTAs = ({
  onReceiveClick,
  onSendClick,
  onCoSignClick,
  popupView = false,
  buttonClassName
}: TransactionCTAsProps): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <div className={styles.buttonsContainer} data-testid="transaction-ctas-container">
      <Button className={buttonClassName} block onClick={onReceiveClick} color="gradient" data-testid="send-button">
        <ArrowDiagonalUp className={classnames(styles.icon, !popupView && styles.iconInExpandedView)} />
        {t('core.transactionCtas.receive')}
      </Button>
      <Button className={buttonClassName} block onClick={onSendClick} color="gradient" data-testid="receive-button">
        <ArrowDiagonalDown className={classnames(styles.icon, !popupView && styles.iconInExpandedView)} />
        {t('core.transactionCtas.send')}
      </Button>
      {onCoSignClick && (
        <Button className={buttonClassName} block onClick={onCoSignClick} color="gradient" data-testid="co-sign-button">
          {t('core.transactionCtas.coSign')}
        </Button>
      )}
    </div>
  );
};
