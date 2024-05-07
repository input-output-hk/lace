import React, { ChangeEvent, useMemo, useState } from 'react';
import styles from './WalletSetupSelectAccountsStepRevamp.module.scss';
import { useTranslate } from '@src/ui/hooks';
import { Input } from '@lace/common';
import { Box, SelectGroup } from '@lace/ui';
import { WalletTimelineSteps } from '../WalletSetup';
import { WalletSetupStepLayoutRevamp } from './WalletSetupStepLayoutRevamp';

const INITIAL_WALLET_NAME = 'Wallet 1';
const nameShouldHaveRightLengthRegex = /^.{1,20}$/;

const validateName = (name: string) => nameShouldHaveRightLengthRegex.test(name);

export interface WalletSetupSelectAccountsStepRevampProps {
  accounts: number;
  onBack: () => void;
  onSubmit: (accountIndex: number, name: string) => void;
  isNextLoading?: boolean;
  onSelectedAccountChange?: () => void;
}

export const WalletSetupSelectAccountsStepRevamp = ({
  accounts,
  onBack,
  onSubmit,
  isNextLoading,
  onSelectedAccountChange
}: WalletSetupSelectAccountsStepRevampProps): React.ReactElement => {
  const [selectedAccount, setSelectedAccount] = useState<string | undefined>('0');
  const [walletName, setWalletName] = useState(INITIAL_WALLET_NAME);
  const [isDirty, setIsDirty] = useState(false);
  const { t } = useTranslate();

  const isNameValid = useMemo(() => validateName(walletName), [walletName]);

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setIsDirty(true);
    setWalletName(e.target.value);
  };

  const options = Array.from({ length: accounts }).map((_, index) => ({
    value: index.toString(),
    label: `Account #${index}`
  }));

  return (
    <WalletSetupStepLayoutRevamp
      title={t('core.walletSetupSelectAccountsStep.setupLaceWallet')}
      onBack={onBack}
      onNext={() => onSubmit(Number(selectedAccount), walletName)}
      isNextEnabled={Number(selectedAccount) >= 0 && !!walletName && isNameValid}
      nextLabel={t('core.walletSetupSelectAccountsStep.enterWallet')}
      description={<div className={styles.subtitle}>{t('core.walletSetupSelectAccountsStep.chooseWalletName')}</div>}
      currentTimelineStep={WalletTimelineSteps.WALLET_SETUP}
      isHardwareWallet
      isNextLoading={isNextLoading}
    >
      <Box mt="$32">
        <div>
          <Input
            dataTestId="wallet-setup-register-name-input"
            label={t('core.walletSetupSelectAccountsStep.walletName')}
            value={walletName}
            onChange={handleNameChange}
            labelClassName={styles.label}
          />
          {isDirty && walletName && !isNameValid && (
            <p className={styles.formError} data-testid="wallet-setup-register-name-error">
              {!isNameValid && t('core.walletSetupSelectAccountsStep.maxCharacters')}
            </p>
          )}
        </div>
        <Box mt="$16">
          <SelectGroup
            placeholder="Accounts"
            options={options}
            onValueChange={(value) => {
              setSelectedAccount(value);
              onSelectedAccountChange?.();
            }}
            showArrow
            withOutline
            selectedValue={selectedAccount}
            contentClassName={styles.selectOptions}
          />
        </Box>
      </Box>
    </WalletSetupStepLayoutRevamp>
  );
};
