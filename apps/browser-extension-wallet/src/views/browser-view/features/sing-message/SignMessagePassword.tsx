import React from 'react';
import { useTranslation } from 'react-i18next';
import { Password } from '@lace/core';
import styles from './SignMessagePassword.module.scss';
import { Button, Drawer, DrawerNavigation } from '@lace/common';
import { OnPasswordChange } from '@input-output-hk/lace-ui-toolkit';

export type SignMessagePasswordProps = {
  isSigningInProgress: boolean;
  error: string;
  handlePasswordChange: OnPasswordChange;
  handlePasswordSubmit: () => void;
  closeDrawer: () => void;
};

export const SignMessagePassword = ({
  isSigningInProgress,
  error,
  handlePasswordChange,
  handlePasswordSubmit,
  closeDrawer
}: SignMessagePasswordProps): JSX.Element => {
  const { t } = useTranslation();

  const footerButtons = (
    <div className={styles.buttonContainer}>
      <Button onClick={handlePasswordSubmit} disabled={isSigningInProgress}>
        {t('core.signMessage.signButton')}
      </Button>
      <Button onClick={closeDrawer} color="secondary">
        {t('core.signMessage.cancelButton')}
      </Button>
    </div>
  );
  return (
    <Drawer
      open
      onClose={() => console.log('onClose')}
      popupView={false}
      navigation={
        <DrawerNavigation
          title={t('core.signMessage.enterPasswordTitle')}
          onCloseIconClick={() => console.log('onCloseIconClick')}
          onArrowIconClick={() => console.log('onArrowIconClick')}
        />
      }
      footer={footerButtons}
    >
      <div className={styles.passwordContainer}>
        <Password
          onChange={handlePasswordChange}
          label={t('core.signMessage.passwordLabel')}
          dataTestId="sign-message-password-input"
          error={!!error}
          errorMessage={error}
          wrapperClassName={styles.passwordWrapper}
        />
      </div>
    </Drawer>
  );
};
