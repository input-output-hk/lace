import React from 'react';
import { RecoveryPhrase } from '@components/RecoveryPhrase';
import { Wallet } from '@lace/cardano';
import { toast } from '@lace/common';
import { useHistory } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAppSettingsContext } from '../../../providers';
import styles from './MnemonicValidation.module.scss';
import { config } from '@src/config';
import { useTranslation } from 'react-i18next';

interface MnemonicValidationProps {
  /** Function to execute when validation is successful */
  onValidationSuccess: () => void;
  /** Wallet account public key */
  publicKey: Wallet.Crypto.Bip32PublicKeyHex;
}

// Validate only amount of words entered
const validateInputs = (mnemonicInput: string[], MNEMONIC_LENGTH: number) =>
  mnemonicInput.filter((word) => word !== '').length === MNEMONIC_LENGTH;

export const MnemonicValidation = ({ publicKey, onValidationSuccess }: MnemonicValidationProps): React.ReactElement => {
  const [settings, updateAppSettings] = useAppSettingsContext();
  const { t } = useTranslation();
  const { goBack } = useHistory();
  const { TOAST_DURATION, MNEMONIC_LENGTH } = config();

  const handleConfirmClick = async (inputMnemonic: string[]): Promise<void> => {
    try {
      const valid = await Wallet.validateWalletMnemonic(inputMnemonic, publicKey);
      if (valid) {
        updateAppSettings({
          ...settings,
          lastMnemonicVerification: dayjs().valueOf().toString()
        });
        onValidationSuccess();
      } else {
        toast.notify({ duration: TOAST_DURATION, text: t('general.errors.invalidMnemonic') });
      }
    } catch {
      // TODO: handle different errors [LW-5448]
      toast.notify({ duration: TOAST_DURATION, text: t('general.errors.invalidMnemonic') });
    }
  };

  return (
    <div className={styles.container}>
      <RecoveryPhrase
        handleBack={goBack}
        recoveryPhrase={{
          validateMnemonic: (mnemonicInout: string[]) => validateInputs(mnemonicInout, MNEMONIC_LENGTH),
          mnemonicLength: MNEMONIC_LENGTH,
          confirmMnemonic: handleConfirmClick
        }}
      />
    </div>
  );
};
