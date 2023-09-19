import React from 'react';
import { Ellipsis, ErrorPane } from '@lace/common';
import { DappInfo, DappInfoProps } from '../DappInfo';
import styles from './DappGovernance.module.scss';
import { ReactComponent as WarningIcon } from '../../assets/icons/warning-icon.component.svg';
import Icon from '@ant-design/icons';
import { useTranslate } from '@src/ui/hooks';

interface GovernanceTx {
  metadata?: { url: string; hash: string };
  deposit: string;
  drepId: string;
}

interface GovernanceDetails {
  governanceTx: GovernanceTx;
  type: 'DRepRegistration' | 'DRepRetirement';
}

export interface DappGovernanceProps {
  /** Governance transaction details such as type and metadata */
  details: GovernanceDetails;
  /** dApp information such as logo, name and url */
  dappInfo: Omit<DappInfoProps, 'className'>;
  /** Optional error message */
  errorMessage?: string;
  hasInsufficientFunds: boolean;
}

export const DappGovernance = ({
  details: { type, governanceTx },
  dappInfo,
  errorMessage,
  hasInsufficientFunds
}: DappGovernanceProps): React.ReactElement => {
  const { t } = useTranslate();

  return (
    <div>
      <DappInfo {...dappInfo} className={styles.dappInfo} />
      {hasInsufficientFunds && (
        <div className={styles.warningAlert}>
          <Icon component={WarningIcon} />
          <p>{t('package.core.dapp.insufficientFunds')}</p>
        </div>
      )}
      {errorMessage && <ErrorPane error={errorMessage} className={styles.error} />}
      <div data-testid="dapp-governance-container" className={styles.details}>
        <div className={styles.header}>
          <div data-testid="dapp-governance-title" className={styles.title}>
            {t('package.core.dapp.governance.metadata')}
          </div>
        </div>
        {type === 'DRepRegistration' && governanceTx.metadata && (
          <>
            <div className={styles.detail}>
              <div data-testid="dapp-governance-url-title" className={styles.title}>
                {t('package.core.dapp.governance.url')}
              </div>
              <div data-testid="dapp-governance-url-value" className={styles.value}>
                <Ellipsis className={styles.rightAligned} text={governanceTx.metadata.url} ellipsisInTheMiddle />
              </div>
            </div>
            <div className={styles.detail}>
              <div data-testid="dapp-governance-hash-title" className={styles.title}>
                {t('package.core.dapp.governance.hash')}
              </div>
              <div data-testid="dapp-governance-hash-value" className={styles.value}>
                <Ellipsis className={styles.rightAligned} text={governanceTx.metadata.hash} ellipsisInTheMiddle />
              </div>
            </div>
          </>
        )}
        <div className={styles.detail}>
          <div data-testid="dapp-governance-drep-id-title" className={styles.title}>
            {t('package.core.dapp.governance.drepId')}
          </div>
          <div data-testid="dapp-governance-drep-id-value" className={styles.value}>
            <Ellipsis className={styles.rightAligned} text={governanceTx.drepId} ellipsisInTheMiddle />
          </div>
        </div>
        <div className={styles.detail}>
          <div data-testid="dapp-governance-deposit-title" className={styles.title}>
            {type === 'DRepRegistration'
              ? t('package.core.dapp.governance.depositPaid')
              : t('package.core.dapp.governance.depositReturned')}
          </div>
          <div data-testid="dapp-governance-deposit-value" className={styles.value}>
            {governanceTx.deposit} ADA
          </div>
        </div>
      </div>
    </div>
  );
};
