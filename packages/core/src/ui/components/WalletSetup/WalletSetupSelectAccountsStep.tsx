import React, { useState } from 'react';
import { WalletSetupStepLayout, WalletTimelineSteps } from './WalletSetupStepLayout';
import styles from './WalletSetupSelectAccountsStep.module.scss';
import { Radio } from 'antd';
import { useTranslation } from 'react-i18next';

export interface WalletSetupSelectAccountsStepProps {
  accounts: number;
  onBack: () => void;
  onSubmit: (accountIndex: number) => void;
  isHardwareWallet?: boolean;
  wallet?: string;
}

export const WalletSetupSelectAccountsStep = ({
  accounts,
  onBack,
  onSubmit,
  wallet
}: WalletSetupSelectAccountsStepProps): React.ReactElement => {
  const [selectedAccount, setSelectedAccount] = useState<number | undefined>();
  const { t } = useTranslation();

  return (
    <WalletSetupStepLayout
      title={t('core.walletSetupSelectAccountsStep.selectAccount')}
      onBack={onBack}
      onNext={() => {
        if (selectedAccount !== undefined) onSubmit(selectedAccount);
      }}
      isNextEnabled={!!selectedAccount && selectedAccount >= 0}
      nextLabel={t('core.walletSetupSelectAccountsStep.exportKeys')}
      description={
        <div className={styles.subtitle}>{t('core.walletSetupSelectAccountsStep.chooseAccountToExport')}</div>
      }
      belowContentText={
        <p className={styles.footerText}>
          {t('core.walletSetupSelectAccountsStep.useHWToConfirm', '', {
            wallet
          })}
        </p>
      }
      currentTimelineStep={WalletTimelineSteps.CONNECT_WALLET}
      isHardwareWallet
    >
      <div className={styles.walletSetupSelectAccountsStep}>
        {Array.from({ length: accounts }).map((_, index) => (
          <div
            key={index}
            className={styles.account}
            onClick={() => setSelectedAccount(index)}
            data-testid={`select-account-${index}`}
          >
            <Radio checked={selectedAccount === index} />
            <p>
              {t('core.walletSetupSelectAccountsStep.account')} {index} {index === 0 && '- Default'}
            </p>
          </div>
        ))}
      </div>
    </WalletSetupStepLayout>
  );
};
